from fastapi import FastAPI
from contextlib import asynccontextmanager
import asyncio
import logging

# Create central app
app = FastAPI(title='Ranitas Vision - Independent Agents')
logger = logging.getLogger('vision.app')

# Lifespan for non-blocking model loading
@asynccontextmanager
async def lifespan(app: FastAPI):
    print('🎯 Iniciando Ranitas Vision - Independent Agents...', flush=True)
    print('🔧 Configurando servicios...', flush=True)
    
    # Start loading tasks in parallel, non-blocking
    try:
        print('🖼️ Iniciando carga de YOLO...', flush=True)
        from vision import load_yolo
        asyncio.create_task(load_yolo())
    except Exception as e:
        logger.warning(f'Failed to start YOLO load: {e}')

    try:
        print('📐 Geometry (OpenCV) listo', flush=True)
    except Exception as e:
        logger.warning(f'Failed to initialize geometry: {e}')

    try:
        print('🧠 Iniciando carga de Ollama...', flush=True)
        from inferencia import load_qwen
        asyncio.create_task(load_qwen())
    except Exception as e:
        logger.warning(f'Failed to start Qwen load: {e}')

    print('🚀 Sistema inicializado, modelos cargando en paralelo...', flush=True)
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
