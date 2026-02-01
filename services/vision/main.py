from fastapi import FastAPI
import threading
from audit import audit

app = FastAPI(title='Vision')

@app.on_event('startup')
def startup():
  import state
  from routes_crop import router as crop_router
  from routes_status import router as status_router
  from routes_analyze import router as analyze_router
  threading.Thread(target=state.load_yolo, daemon=True).start()
  threading.Thread(target=state.monitor_ollama, daemon=True).start()
  app.include_router(crop_router)
  app.include_router(status_router)
  app.include_router(analyze_router)

@app.get('/')
@audit('root')
async def root():
  return {'ok':True,'service':'Vision'}
