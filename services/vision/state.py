import os
import time
import requests
from ultralytics import YOLO

VISION_MODEL = os.getenv('VISION_MODEL','/app/models/yoloe-26x-seg.pt')
LLM_MODEL = os.getenv('LLM_MODEL','qwen2.5vl:7b')
OLLAMA_HOST = os.getenv('OLLAMA_HOST','http://127.0.0.1:11434')
# Vision targets focused for document detection (open-vocabulary set)
TARGETS = {"invoice","receipt","ticket","scanned document","printed page"}
# Prompt phrases / synonyms fed to YOLO-E (open-vocabulary prompt)
PROMPT_PHRASES = ["piece of paper","receipt","invoice","document","ticket","printed ticket","printed document","printed page","factura","comprobante","scanned document","printed page"]

state = {
  'yolo': {'status':'init','model':VISION_MODEL},
  'llm': {'status':'service_offline','model':LLM_MODEL,'present':False},
  'hardware':{}, 'audit':{}, 'counters':{'tasks':{}, 'errors':0}
}

# Lightweight in-memory log buffer for /logs endpoint
_LOG_BUFFER = []
_BUFFER_MAX = 1000

def push_log(level, tag, msg):
  try:
    _LOG_BUFFER.append({'ts': time.time(), 'level': level, 'tag': tag, 'msg': str(msg)})
    while len(_LOG_BUFFER) > _BUFFER_MAX:
      _LOG_BUFFER.pop(0)
  except Exception:
    pass


def get_logs(n=200):
  out = _LOG_BUFFER[-n:]
  return [{'ts': time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime(int(r['ts']))), 'level': r['level'], 'tag': r['tag'], 'msg': r['msg']} for r in out]
# expose prompts and canonical targets to runtime state for routes and diagnostics
state['TARGETS'] = TARGETS
state['PROMPT_PHRASES'] = PROMPT_PHRASES
state['vision_prompt'] = ', '.join(PROMPT_PHRASES) 

# lightweight VRAM probe
def get_vram():
  try:
    import pynvml
    pynvml.nvmlInit()
    h = pynvml.nvmlDeviceGetHandleByIndex(0)
    m = pynvml.nvmlDeviceGetMemoryInfo(h)
    try:
      # nvmlDeviceGetName may return bytes or str depending on binding
      raw_name = pynvml.nvmlDeviceGetName(h)
      gpu_name = raw_name.decode('utf-8') if isinstance(raw_name, (bytes, bytearray)) else str(raw_name)
    except Exception:
      gpu_name = None
    return {'gpu': gpu_name, 'total': int(m.total), 'free': int(m.free), 'used': int(m.used)}
  except Exception:
    # Fallback: try torch if available to at least get the device name
    try:
      import torch
      if torch.cuda.is_available():
        try:
          gpu_name = torch.cuda.get_device_name(0)
          return {'gpu': gpu_name, 'total': None, 'free': None, 'used': None}
        except Exception:
          pass
    except Exception:
      pass
    return {}

# Loaders/monitors used at startup
def load_yolo():
  state['yolo'].update({'status':'initializing'})
  try:
    # log state transition
    try: push_log('info','yolo','initializing')
    except: pass
    state['yolo']['status']='loading_vram'
    try: push_log('info','yolo','loading_vram')
    except: pass
    m = YOLO(VISION_MODEL)
    # Try to configure model to focus on document classes (open-vocabulary / set_classes)
    try:
      if hasattr(m, 'set_classes'):
        try:
          # Prefer calling set_classes with text prompt embeddings if supported by model
          if hasattr(m, 'get_text_pe'):
            pe = m.get_text_pe(list(PROMPT_PHRASES))
            m.set_classes(list(PROMPT_PHRASES), pe)
          else:
            m.set_classes(list(PROMPT_PHRASES))
        except TypeError:
          # fallback simple call if method signature differs
          m.set_classes(list(PROMPT_PHRASES))
      # compute and store indices for the configured target classes present in model.names
      names = getattr(m, 'names', {})
      indices = []
      if isinstance(names, dict):
        indices = [int(k) for k,v in names.items() if v in set(PROMPT_PHRASES)]
      else:
        indices = [i for i,v in enumerate(names) if v in set(PROMPT_PHRASES)]
      state['yolo']['target_indices'] = indices
      state['yolo']['prompt_phrases'] = PROMPT_PHRASES
    except Exception as e:
      # non-fatal: record a warning for diagnostics
      state['yolo']['load_warn'] = str(e)
      try: push_log('warn','yolo', f'load_warn: {e}')
      except: pass
    state['yolo']['_model'] = m
    state['yolo']['status'] = 'ready'
    try: push_log('info','yolo','ready')
    except: pass
  except Exception as e:
    state['yolo'].update({'status':'error','error':str(e)})
    try: push_log('error','yolo', str(e))
    except: pass

def monitor_ollama(loop_delay=5):
  import time
  while True:
    state['llm']['status'] = 'checking_tags'
    try:
      r = requests.get(f"{OLLAMA_HOST}/api/tags", timeout=5)
      tags = r.json() if r.status_code == 200 else []

      # Normalize tags into a simple models list for robust matching
      models = []
      try:
        if isinstance(tags, list):
          for t in tags:
            if isinstance(t, str):
              models.append(t)
            elif isinstance(t, dict):
              # Ollama may return objects; try common keys
              name = t.get('name') or t.get('model') or t.get('id')
              size = t.get('size') or t.get('tag') or t.get('model_size')
              if name and size:
                models.append(f"{name}:{size}")
              elif name:
                models.append(str(name))
              else:
                models.append(str(t))
        elif isinstance(tags, dict):
          # Defensive: convert dict into single-entry list representation
          models.append(str(tags))
        else:
          models = [str(tags)]
      except Exception:
        models = [str(t) for t in tags]

      # Deduplicate and store
      models = list(dict.fromkeys(models))

      # Determine presence: accept exact match, substring or reverse substring to tolerate formatting
      present = any(
        LLM_MODEL == m or LLM_MODEL in m or m in LLM_MODEL
        for m in models
      )

      # Update state with richer info (tags raw + normalized models list)
      new_status = 'ready' if present else 'model_missing'
      state['llm'].update({
        'status': new_status,
        'present': present,
        'tags': tags,
        'models': models,
      })
      try:
        push_log('info','llm', f'status={new_status} models={models}')
      except Exception:
        pass
    except Exception as e:
      state['llm'].update({'status': 'service_offline', 'error': str(e)})
      try: push_log('error','llm', str(e))
      except: pass
    time.sleep(loop_delay)