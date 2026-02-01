from fastapi import APIRouter
from pydantic import BaseModel
import asyncio, requests, base64, cv2, numpy as np
from audit import audit
from state import state, OLLAMA_HOST, LLM_MODEL

router = APIRouter()

from typing import Optional

from typing import List

def preprocess_for_qwen(img_b64: str) -> str:
  """Resize image to múltiplos de 28 (Qwen2.5-VL requirement) maintaining aspect ratio.
  Max dimension: 1120 (40*28) for balance between quality and speed.
  """
  try:
    # Decode base64
    img_bytes = base64.b64decode(img_b64)
    arr = np.frombuffer(img_bytes, np.uint8)
    img = cv2.imdecode(arr, cv2.IMREAD_COLOR)
    if img is None:
      print('WARN preprocess_for_qwen: failed to decode image')
      return img_b64
    
    h, w = img.shape[:2]
    print(f'INFO preprocess_for_qwen: original size {w}x{h}')
    
    # Find múltiplos de 28 that preserve aspect ratio
    # Max dimension: 1120 (40*28)
    max_dim = 1120
    aspect = w / h
    
    if max(w, h) <= max_dim and w % 28 == 0 and h % 28 == 0:
      # Already optimal
      print(f'INFO preprocess_for_qwen: already múltiplo de 28, no resize needed')
      return img_b64
    
    # Scale down to max_dim maintaining aspect ratio
    if w > h:
      new_w = min(w, max_dim)
      new_h = int(new_w / aspect)
    else:
      new_h = min(h, max_dim)
      new_w = int(new_h * aspect)
    
    # Round to nearest múltiplo de 28
    new_w = max(28, int(round(new_w / 28) * 28))
    new_h = max(28, int(round(new_h / 28) * 28))
    
    print(f'INFO preprocess_for_qwen: resizing to {new_w}x{new_h} (múltiplos de 28)')
    
    resized = cv2.resize(img, (new_w, new_h), interpolation=cv2.INTER_LANCZOS4)
    _, buf = cv2.imencode('.jpg', resized, [cv2.IMWRITE_JPEG_QUALITY, 95])
    new_b64 = base64.b64encode(buf).decode()
    
    print(f'INFO preprocess_for_qwen: encoded {len(buf)} bytes')
    return new_b64
  except Exception as e:
    print(f'ERROR preprocess_for_qwen: {e}')
    return img_b64

class AnalyzeRequest(BaseModel):
  image: str  # base64 encoded image
  prompt: Optional[str] = None
  model: Optional[str] = None  # Allow client to specify model (though we use LLM_MODEL from env)
  mode: Optional[str] = None   # Passthrough for client-side tracking
  # Optional polygon points (4 points) returned by /crop. Keep as passthrough for debugging or cropping upstream.
  src_coords: Optional[List[List[float]]] = None
  coords_are_pixels: Optional[bool] = None

@router.post('/analyze')
@audit('analyze')
async def analyze(req: AnalyzeRequest):
  """Accepts a base64-encoded image and an optional prompt, forwards to Ollama (multimodal model).
  Returns the model response (or an error if the LLM model is missing).
  """
  if not state.get('llm', {}).get('present'):
    return {'ok':False,'error':'llm_model_missing','present':state.get('llm',{}).get('present')}

  # Preprocess image for Qwen (resize to múltiplos de 28)
  processed_image = preprocess_for_qwen(req.image)

  # Usar prompt del request o un default básico
  prompt_text = req.prompt or 'Analyze this image and extract all relevant information as JSON.'
  
  print(f'INFO /analyze: mode={req.mode}, prompt_len={len(prompt_text)}, has_coords={req.src_coords is not None}')

  payload = {
    'model': LLM_MODEL,
    'prompt': prompt_text,
    'images': [processed_image],
    'max_tokens': 4096,  # Aumentado para respuestas más largas
    'keep_alive': -1,
    'stream': False
  }

  loop = asyncio.get_running_loop()
  def call_ollama():
    try:
      r = requests.post(f"{OLLAMA_HOST}/api/generate", json=payload, timeout=300)  # 5 min timeout
      if r.status_code == 200:
        data = r.json()
        # Ollama multimodal responses often include a 'response' field
        return {'ok': True, 'result': data.get('response', data)}
      else:
        return {'ok': False, 'status_code': r.status_code, 'text': r.text}
    except requests.exceptions.Timeout:
      return {'ok': False, 'error': 'timeout', 'text': 'Ollama request timed out after 300s'}
    except Exception as e:
      return {'ok': False, 'error': str(e), 'text': str(e)}

  # Log received src_coords for debugging (helps track crop → analyze flow)
  if req.src_coords:
    print('analyze: received src_coords:', req.src_coords, 'coords_are_pixels:', req.coords_are_pixels)

  res = await loop.run_in_executor(None, call_ollama)

  # Include any received coords in the response to make it observable by callers
  if isinstance(res, dict):
    res['src_coords_received'] = req.src_coords
    res['coords_are_pixels'] = req.coords_are_pixels
  return res
