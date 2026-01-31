import os
import requests
from ultralytics import YOLO

VISION_MODEL = os.getenv('VISION_MODEL','/app/models/yoloe-26x-seg.pt')
LLM_MODEL = os.getenv('LLM_MODEL','qwen2.5vl:7b')
OLLAMA_HOST = os.getenv('OLLAMA_HOST','http://127.0.0.1:11434')
# Vision targets focused for document detection (open-vocabulary set)
TARGETS = {"invoice","receipt","ticket","scanned document","printed page"}
# Prompt phrases / synonyms fed to YOLO-E (open-vocabulary prompt)
PROMPT_PHRASES = ["piece of paper","receipt","invoice","document","ticket","printed ticket","printed document","factura","comprobante","scanned document","printed page"]

state = {
  'yolo': {'status':'init','model':VISION_MODEL},
  'llm': {'status':'service_offline','model':LLM_MODEL,'present':False},
  'hardware':{}, 'audit':{}, 'counters':{'tasks':{}, 'errors':0}
}
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
    state['yolo']['status']='loading_vram'
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
    state['yolo']['_model'] = m
    state['yolo']['status'] = 'ready'
  except Exception as e:
    state['yolo'].update({'status':'error','error':str(e)})

def monitor_ollama(loop_delay=5):
  import time
  while True:
    state['llm']['status']='checking_tags'
    try:
      r = requests.get(f"{OLLAMA_HOST}/api/tags", timeout=5)
      tags = r.json() if r.status_code==200 else []
      present = any(LLM_MODEL in str(t) for t in tags)
      state['llm'].update({'status':'ready' if present else 'model_missing','present':present,'tags':tags})
    except Exception as e:
      state['llm'].update({'status':'service_offline','error':str(e)})
    time.sleep(loop_delay)