from fastapi import FastAPI
from contextlib import asynccontextmanager
import asyncio
import logging
import os

# Create central app
app = FastAPI(title='Ranitas Vision - Independent Agents')
logger = logging.getLogger('vision.app')

# Flag file to prevent duplicate startup messages
_STARTUP_FLAG = '/tmp/vision_startup.flag'

# Lifespan for non-blocking model loading
@asynccontextmanager
async def lifespan(app: FastAPI):
    flag_exists = os.path.exists(_STARTUP_FLAG)
    
    if not flag_exists:
        print('🎯 Iniciando Ranitas Vision - Independent Agents...', flush=True)
        print('🔧 Configurando servicios...', flush=True)
    
    # Start loading tasks in parallel, non-blocking
    try:
        if not flag_exists:
            print('🖼️ Iniciando verificación y carga de modelos...', flush=True)
        # Use a minimal loader that ensures files exist (downloads if needed) and loads models
        from loader import ensure_and_load_all
        asyncio.create_task(ensure_and_load_all())
    except Exception as e:
        logger.warning(f'Failed to start model loader: {e}')

    try:
        if not flag_exists:
            print('📐 Geometry (OpenCV) listo', flush=True)
    except Exception as e:
        logger.warning(f'Failed to initialize geometry: {e}')

    try:
        if not flag_exists:
            print('🧠 Iniciando carga de Ollama...', flush=True)
        from inferencia import load_qwen
        asyncio.create_task(load_qwen())
    except Exception as e:
        logger.warning(f'Failed to start Qwen load: {e}')

    if not flag_exists:
        print('🚀 Sistema inicializado, modelos cargando en paralelo...', flush=True)
        # Create flag file
        try:
            with open(_STARTUP_FLAG, 'w') as f:
                f.write('started')
        except:
            pass
    
    yield

app = FastAPI(lifespan=lifespan)

# Include routers
try:
    from vision import router as vision_router
    app.include_router(vision_router, prefix='/vision')
except Exception as e:
    logger.warning(f'Could not include vision router: {e}')

try:
    from inferencia import router as llm_router
    app.include_router(llm_router, prefix='/llm')
    # Also expose the same LLM endpoints at the root path for convenience (/analyze)
    app.include_router(llm_router, prefix='')
except Exception as e:
    logger.warning(f'Could not include llm router: {e}')

try:
    from status import router as status_router
    app.include_router(status_router, prefix='/status')
except Exception as e:
    logger.warning(f'Could not include status router: {e}')

@app.get('/')
async def root():
    return {'ok': True, 'service': 'ranitas-vision', 'agents': ['vision', 'llm', 'status']}
