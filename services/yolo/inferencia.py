from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import httpx
import base64
import asyncio

try:
    from status import update_llm_status
except Exception:
    update_llm_status = lambda *args: None

router = APIRouter()

OLLAMA_HOST = 'http://127.0.0.1:11434'
MODEL = 'qwen2.5vl:7b'

async def load_qwen():
    try:
        print('🤖 Iniciando carga de Ollama Qwen...', flush=True)
        update_llm_status('loading')
        
        print(f'📥 Verificando/descargando modelo {MODEL}...', flush=True)
        # Pull model if needed
        async with httpx.AsyncClient(timeout=300) as c:
            resp = await c.post(f"{OLLAMA_HOST}/api/pull", json={'name': MODEL})
            if resp.status_code == 200:
                print('🔥 Realizando warmup del modelo...', flush=True)
                # Quick warmup call
                warmup_payload = {
                    'model': MODEL,
                    'prompt': 'Hello',
                    'stream': False,
                    'keep_alive': -1
                }
                warmup_resp = await c.post(f"{OLLAMA_HOST}/api/generate", json=warmup_payload)
                if warmup_resp.status_code == 200:
                    print('✅ Ollama Qwen listo y operativo!', flush=True)
                    update_llm_status('ready', MODEL)
                else:
                    print(f'⚠️ Pull OK pero warmup falló: {warmup_resp.status_code}', flush=True)
                    update_llm_status('ready', MODEL)  # Still mark as ready if pull worked
            else:
                print(f'❌ Error descargando modelo: {resp.status_code}', flush=True)
                update_llm_status('error')
    except Exception as e:
        print(f'❌ Error cargando Ollama: {e}', flush=True)
        update_llm_status('error')
        raise

class AnalyzeRequest(BaseModel):
    image: str  # base64 encoded image

@router.post('/analyze')
async def analyze(req: AnalyzeRequest):
    try:
        # Decode base64
        img_data = base64.b64decode(req.image)
        # Send to Ollama with keep_alive=-1
        payload = {
            'model': MODEL,
            'prompt': 'Analyze this invoice image and extract all relevant information as JSON.',
            'images': [req.image],  # base64
            'keep_alive': -1,
            'stream': False
        }
        async with httpx.AsyncClient(timeout=300) as c:
            resp = await c.post(f"{OLLAMA_HOST}/api/generate", json=payload)
            if resp.status_code == 200:
                data = resp.json()
                return {'ok': True, 'result': data.get('response', '')}
            else:
                raise HTTPException(status_code=500, detail=f'Ollama error: {resp.text}')
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get('/health')
async def health():
    return {'ok': True}
