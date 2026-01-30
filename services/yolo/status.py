from fastapi import APIRouter
import time
from typing import Dict, Any

# logging helper using required icons
def _log(msg, icon='📊', tag='[STATUS]'):
    print(f"{icon} {tag} {msg}")

try:
    import torch
except Exception:
    torch = None

router = APIRouter()

# Estado global en tiempo real
_STATE: Dict[str, Any] = {
    'yolo': {'status': 'loading', 'model': None},
    'geometry': {'status': 'ready'},  # OpenCV siempre listo
    'llm': {'status': 'loading', 'model': None},
    'gpu': None,
    'vram_free': None,
    'vram_total': None,
    'last_updated': None,
    'last_vram_log': 0  # Timestamp del último log de VRAM
}

def update_yolo_status(status: str, model: str | None = None):
    _STATE['yolo']['status'] = status
    if model:
        _STATE['yolo']['model'] = model

def update_llm_status(status: str, model: str | None = None):
    _STATE['llm']['status'] = status
    if model:
        _STATE['llm']['model'] = model

def update_vram_free():
    current_time = time.time()
    
    # Solo actualizar VRAM cada 5 minutos para reducir logs
    if current_time - _STATE['last_vram_log'] < 300:  # 5 minutos
        # Actualizar valores silenciosamente sin logs
        if torch and torch.cuda.is_available():
            try:
                free, total = torch.cuda.mem_get_info()
                _STATE['vram_free'] = round(free / 1024**3, 2)
                _STATE['vram_total'] = round(total / 1024**3, 2)
                # Mantener GPU name si ya está detectado
                if not _STATE['gpu']:
                    gpu_name = torch.cuda.get_device_name(0)
                    _STATE['gpu'] = gpu_name
            except Exception as e:
                pass  # Silenciar errores también
        return
    
    # Log completo cada 5 minutos
    _STATE['last_vram_log'] = current_time
    
    if torch and torch.cuda.is_available():
        try:
            # Detect GPU name
            gpu_name = torch.cuda.get_device_name(0)
            _STATE['gpu'] = gpu_name
            _log(f'GPU detectada: {gpu_name}', '🎮')
            
            free, total = torch.cuda.mem_get_info()
            _STATE['vram_free'] = round(free / 1024**3, 2)
            _STATE['vram_total'] = round(total / 1024**3, 2)
            _log(f'VRAM: {_STATE["vram_free"]}GB libre de {_STATE["vram_total"]}GB', '💾')
            
            # Log de estado general cada 5 minutos
            yolo_status = _STATE['yolo']['status']
            llm_status = _STATE['llm']['status']
            geometry_status = _STATE['geometry']['status']
            _log(f'Estado general - YOLO: {yolo_status}, LLM: {llm_status}, Geometry: {geometry_status}', '🔥')
            
        except Exception as e:
            _log(f'Error detectando GPU/VRAM: {e}', '❌')
            _STATE['gpu'] = None
            _STATE['vram_free'] = None
            _STATE['vram_total'] = None
    else:
        _STATE['gpu'] = None
        _STATE['vram_free'] = None
        _STATE['vram_total'] = None
        _log('GPU no disponible', '⚠️')
    _STATE['last_updated'] = time.time()

@router.get('')
async def status():
    update_vram_free()
    
    # Build loaded models list for UI
    models = []
    if _STATE['yolo']['status'] == 'ready' and _STATE['yolo']['model']:
        model_name = _STATE['yolo']['model'].split('/')[-1]  # Get filename
        models.append(model_name)
    
    if _STATE['llm']['status'] == 'ready' and _STATE['llm']['model']:
        models.append(_STATE['llm']['model'])
    
    # Add to state for UI consumption
    result = dict(_STATE)
    result['models'] = models
    result['loadedModels'] = models  # For compatibility
    
    return result