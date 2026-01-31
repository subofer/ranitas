from fastapi import APIRouter
import time
import os
from typing import Dict, Any

# logging helper using required icons
_LAST_LOG = {'msg': None, 'ts': 0, 'count': 0}
_LOG_BUFFER = []
_BUFFER_MAX = 1000

def _push_buffer(level, tag, msg):
    try:
        _LOG_BUFFER.append({'ts': time.time(), 'level': level, 'tag': tag, 'msg': str(msg)})
        while len(_LOG_BUFFER) > _BUFFER_MAX:
            _LOG_BUFFER.pop(0)
    except Exception:
        pass


def _log(msg, icon='📊', tag='[STATUS]'):
    # determine severity
    level = 'info'
    if '❌' in icon or 'error' in str(msg).lower() or tag == '[ERROR]':
        level = 'error'
    elif '⚠️' in icon or 'warn' in str(msg).lower():
        level = 'warn'
    try:
        formatted = f"{icon} {tag} {msg}"
        now = time.time()
        # push to buffer always
        _push_buffer(level, tag, formatted)
        if _LAST_LOG['msg'] == formatted and (now - _LAST_LOG['ts']) < 5:
            _LAST_LOG['count'] += 1
            return
        if _LAST_LOG['count'] > 1 and _LAST_LOG['msg'] != formatted:
            print(f"⤴️ (previous message repeated {_LAST_LOG['count']} times) {_LAST_LOG['msg']}")
        if level == 'error':
            RED = '\033[91m'; RESET = '\033[0m'
            print(f"{RED}{formatted}{RESET}")
        else:
            print(formatted)
        _LAST_LOG['msg'] = formatted
        _LAST_LOG['ts'] = now
        _LAST_LOG['count'] = 1
    except Exception:
        try:
            print(f"{icon} {tag} {msg}")
        except Exception:
            pass


def get_logs(n=200):
    # Return last n logs as list of dicts (ts numeric -> ISO string for readability)
    out = _LOG_BUFFER[-n:]
    return [{'ts': time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime(int(r['ts']))), 'level': r['level'], 'tag': r['tag'], 'msg': r['msg']} for r in out]

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

# Flag to show initial status only once
_initial_status_shown = False
_STATUS_FLAG = '/tmp/vision_status_shown.flag'

def update_yolo_status(status: str, model: str | None = None):
    old_status = _STATE['yolo']['status']
    _STATE['yolo']['status'] = status
    if model:
        _STATE['yolo']['model'] = model
    if old_status != status:
        _log(f"YOLO cambió de {old_status} a {status}", '🔄')


def update_llm_status(status: str, model: str | None = None):
    old_status = _STATE['llm']['status']
    _STATE['llm']['status'] = status
    if model:
        _STATE['llm']['model'] = model
    if old_status != status:
        _log(f"LLM cambió de {old_status} a {status}", '💬')

def show_initial_status():
    """Show initial status once"""
    gpu_info = f"{_STATE['gpu']} ({_STATE['vram_free']}GB libre)" if _STATE['gpu'] else "No detectada"
    _log(f"GPU detectada: {gpu_info}", '🎮')
    _log(f"VRAM: {_STATE['vram_free']}GB libre de {_STATE['vram_total']}GB", '💾')
    yolo_status = f"YOLO: {_STATE['yolo']['status']}"
    llm_status = f"LLM: {_STATE['llm']['status']}"
    geom_status = f"Geometry: {_STATE['geometry']['status']}"
    _log(f"Estado general - {yolo_status}, {llm_status}, {geom_status}", '🔥')

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
    
    # Show initial status once using file flag
    if not os.path.exists(_STATUS_FLAG):
        show_initial_status()
        try:
            with open(_STATUS_FLAG, 'w') as f:
                f.write('shown')
        except:
            pass
    
    # Build loaded models list for UI
    models = []
    if _STATE['yolo']['status'] == 'ready' and _STATE['yolo']['model']:
        model_name = _STATE['yolo']['model'].split('/')[-1]  # Get filename
        models.append(model_name)
    
    if _STATE['llm']['status'] == 'ready' and _STATE['llm']['model']:
        models.append(_STATE['llm']['model'])

    # List available model files on disk even if not loaded
    available = []
    try:
        for f in os.listdir('/app/models'):
            available.append(f)
    except Exception:
        pass

    # Add to state for UI consumption
    result = dict(_STATE)
    result['models'] = models
    result['loadedModels'] = models  # For compatibility
    result['availableModels'] = available
    result['available_models'] = available

    # Detailed model info for progressive migration (does not break existing keys)
    models_info = {
        'yolo': {
            'status': _STATE['yolo'].get('status'),
            'model_path': _STATE['yolo'].get('model')
        },
        'llm': {
            'status': _STATE['llm'].get('status'),
            'model': _STATE['llm'].get('model')
        },
        'available_models': available
    }
    result['models_info'] = models_info

    return result


@router.get('/logs')
async def logs(n: int = 200):
    """Return last n logs from in-memory buffer"""
    try:
        from .status import get_logs
        # get_logs returns list of dicts
        logs = get_logs(n)
        return {'ok': True, 'logs': logs}
    except Exception as e:
        return {'ok': False, 'error': str(e)}