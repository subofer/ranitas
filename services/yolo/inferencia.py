from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import httpx
import base64
import asyncio
import os

try:
    from status import update_llm_status
except Exception:
    update_llm_status = lambda *args: None

router = APIRouter()

OLLAMA_HOST = 'http://127.0.0.1:11434'
MODEL = 'qwen2.5vl:7b'

# Use file-based flag to prevent duplicate messages across workers
_LOADED_FLAG = '/tmp/qwen_loaded.flag'

async def load_qwen():
    try:
        # Indicate we're about to attempt pulling/loading the model
        update_llm_status('downloading')
        
        # Pull model if needed (silently)
        async with httpx.AsyncClient(timeout=300) as c:
            resp = await c.post(f"{OLLAMA_HOST}/api/pull", json={'name': MODEL})
            if resp.status_code == 200:
                # Quick warmup call
                warmup_payload = {
                    'model': MODEL,
                    'prompt': 'Hello',
                    'stream': False,
                    'keep_alive': -1
                }
                warmup_resp = await c.post(f"{OLLAMA_HOST}/api/generate", json=warmup_payload)
                if warmup_resp.status_code == 200:
                    update_llm_status('ready', MODEL)
                else:
                    update_llm_status('ready', MODEL)  # Still mark as ready if pull worked
            else:
                update_llm_status('error')
    except Exception as e:
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
            'prompt': 'Encontra principalmente el CUIT y analiza esta imagen de factura para extraer toda la información relevante en formato JSON.',
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
