from fastapi import APIRouter
from pydantic import BaseModel
import asyncio, requests
from audit import audit
from state import state, OLLAMA_HOST, LLM_MODEL

router = APIRouter()

from typing import Optional

class AnalyzeRequest(BaseModel):
  image: str  # base64 encoded image
  prompt: Optional[str] = None

@router.post('/analyze')
@audit('analyze')
async def analyze(req: AnalyzeRequest):
  """Accepts a base64-encoded image and an optional prompt, forwards to Ollama (multimodal model).
  Returns the model response (or an error if the LLM model is missing).
  """
  if not state.get('llm', {}).get('present'):
    return {'ok':False,'error':'llm_model_missing','present':state.get('llm',{}).get('present')}

  prompt_text = req.prompt or 'Analyze this invoice image and extract all relevant information as JSON.'

  payload = {
    'model': LLM_MODEL,
    'prompt': prompt_text,
    'images': [req.image],
    'max_tokens': 1024,
    'keep_alive': -1,
    'stream': False
  }

  loop = asyncio.get_running_loop()
  def call_ollama():
    r = requests.post(f"{OLLAMA_HOST}/api/generate", json=payload, timeout=120)
    if r.status_code == 200:
      data = r.json()
      # Ollama multimodal responses often include a 'response' field
      return {'ok': True, 'result': data.get('response', data)}
    else:
      return {'ok': False, 'status_code': r.status_code, 'text': r.text}

  res = await loop.run_in_executor(None, call_ollama)
  return res
