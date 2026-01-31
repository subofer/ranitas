from fastapi import APIRouter
from audit import audit
from state import state, get_vram

router = APIRouter()

@router.get('/status')
@audit('status')
async def status():
  try:
    vram = get_vram()
    if vram: state['hardware']['vram']=vram

    # Build a *safe* payload (whitelist fields) to avoid serializing complex objects (models, class instances)
    s = state
    safe_yolo = {}
    for k in ('status','model','models','load_warn','target_indices','prompt_phrases'):
      if k in s.get('yolo', {}): safe_yolo[k] = s['yolo'][k]
    safe_llm = {}
    for k in ('status','model','present','tags','error'):
      if k in s.get('llm', {}): safe_llm[k] = s['llm'][k]
    safe_hardware = s.get('hardware', {})
    safe_audit = s.get('audit', {})
    safe_counters = s.get('counters', {})

    payload = {
      'ok': True,
      'service': 'vision-ai',
      'yolo': safe_yolo,
      'llm': safe_llm,
      'hardware': safe_hardware,
      'audit': safe_audit,
      'counters': safe_counters
    }

    # Expose simple VRAM/cuda info for status mapper compatibility
    if vram and isinstance(vram, dict) and 'total' in vram:
      total_gb = round(vram['total'] / 1e9, 2)
      free_gb = round(vram.get('free', 0) / 1e9, 2) if vram.get('free') is not None else None
      gpu_name = vram.get('gpu') if isinstance(vram.get('gpu'), str) and vram.get('gpu') else None
      payload['cuda'] = {'gpu': gpu_name, 'vram_gb': total_gb, 'vram_free': free_gb, 'vram_used': round((total_gb - (free_gb or 0)), 2) if free_gb is not None else None}
      payload['vram_total'] = total_gb
      payload['vram_free'] = free_gb

    # Derive models list from known fields (yolo.model/path or yolo.models)
    import os
    models = []
    y = payload.get('yolo') or {}
    mpath = y.get('model') or y.get('path')
    if isinstance(mpath, str) and mpath:
      base = os.path.basename(mpath)
      name = os.path.splitext(base)[0]
      models.append(name)
      if not y.get('models'):
        payload['yolo']['models'] = [name]
    # Include ollama/llm models if present
    oll = payload.get('ollama') or payload.get('llm') or {}
    if isinstance(oll, dict):
      arr = oll.get('models') or []
      for mm in arr:
        if mm and mm not in models:
          models.append(mm)

    if models:
      payload['models'] = list(dict.fromkeys(models))
      payload['loadedModels'] = payload.get('loadedModels') or payload['models']

    # Add simple events to help UI heuristics (since findSince looks for load/ready messages)
    from datetime import datetime
    now = datetime.utcnow().isoformat() + 'Z'
    events = []
    if y.get('status') == 'ready':
      events.append({'ts': now, 'service': 'yolo', 'message': 'loaded', 'level': 'info'})
    if state.get('audit'):
      a = state['audit']
      ev = {'ts': now, 'service': a.get('last_op') or 'audit', 'message': a.get('last_status') or '', 'level': 'info'}
      if a.get('last_error'):
        ev['level'] = 'error'; ev['message'] = a.get('last_error')
      events.append(ev)
    if events:
      payload['events'] = events

@router.get('/logs')
async def logs(n: int = 200, container: str | None = None, tail: int = 200):
  """Return last n logs from local buffer; if container param is provided and docker CLI exists, return docker logs too.
     container: 'vision' or 'postgres' (maps to ranitas-vision / ranitas-postgres)
  """
  try:
    # local buffer from state
    local_logs = []
    try:
      local_logs = get_logs(n)
    except Exception:
      local_logs = []

    # Optionally fetch docker logs (non-blocking with timeout)
    docker_logs = None
    if container in ('vision','postgres'):
      import subprocess, shlex
      container_name = 'ranitas-vision' if container == 'vision' else 'ranitas-postgres'
      try:
        cmd = f"docker logs --tail {tail} {container_name}"
        proc = subprocess.run(shlex.split(cmd), capture_output=True, text=True, timeout=4)
        if proc.returncode == 0:
          docker_logs = proc.stdout.splitlines()[-tail:]
        else:
          docker_logs = [proc.stderr or f'docker logs failed with code {proc.returncode}']
      except Exception as e:
        docker_logs = [f'Error fetching docker logs: {e}']

    return {'ok': True, 'logs': local_logs, 'docker_logs': docker_logs}
  except Exception as e:
    import traceback
    tb = traceback.format_exc()
    return {'ok': False, 'error': str(e), 'traceback': tb}

    # Build a light-weight `services` array so external status mappers (docker/status) can rely on a
    # consistent structure with `name`, `source`, `type`, `models`, `ready` and an optional `since`.
    # This is additive and does not change existing fields, ensuring backward compatibility.
    try:
      import re
      def find_since(svc_name):
        for ev in list(events[::-1]):
          if ev.get('service') == svc_name and re.search(r'load|ready|models_available|loaded', str(ev.get('message') or ''), re.I):
            return ev.get('ts')
        return None

      services = []
      y = payload.get('yolo') or {}
      if isinstance(y, dict) and y.get('status'):
        services.append({
          'name': 'yolo', 'source': 'ranitas-vision', 'type': 'vision',
          'models': y.get('models') or [], 'ready': y.get('status') == 'ready', 'since': find_since('yolo')
        })

      geom = state.get('geometry') or payload.get('geometry') or {}
      if isinstance(geom, dict) and geom.get('status'):
        services.append({
          'name': 'geometry', 'source': 'ranitas-vision', 'type': 'geometry',
          'models': [], 'ready': geom.get('status') == 'ready', 'since': find_since('geometry')
        })

      oll = payload.get('ollama') or payload.get('llm') or {}
      if isinstance(oll, dict):
        services.append({
          'name': 'ollama', 'source': 'ranitas-vision', 'type': 'llm',
          'models': oll.get('models') or [],
          'ready': bool(oll.get('ready') or oll.get('present') or (oll.get('status') == 'ready')),
          'since': find_since('ollama')
        })

      if services:
        payload['services'] = services
    except Exception:
      # Non-fatal: if any error occurs while building `services`, ignore to preserve backward compatibility
      pass

    # Safety: convert payload into a JSON-safe structure (string keys and serializable values)
    def safe_serialize(obj, depth=0):
      if depth>4:
        return str(type(obj).__name__)
      if obj is None:
        return None
      if isinstance(obj, (str, int, float, bool)):
        return obj
      if isinstance(obj, dict):
        out = {}
        for k, v in obj.items():
          try:
            key = str(k)
          except Exception:
            key = '<unserializable-key>'
          try:
            out[key] = safe_serialize(v, depth+1)
          except Exception:
            out[key] = '<unserializable-value>'
        return out
      if isinstance(obj, (list, tuple, set)):
        lst = list(obj)
        # limit to first 100 elements to avoid huge responses
        return [safe_serialize(x, depth+1) for x in lst[:100]]
      # Fallback to string representation
      return str(obj)

    try:
      # First attempt: use FastAPI's jsonable_encoder to check for serialization issues.
      from fastapi.encoders import jsonable_encoder
      try:
        _ = jsonable_encoder(payload)
        # If jsonable_encoder succeeded, return the safe-serialized payload (extra safety)
        return safe_serialize(payload)
      except Exception as je:
        # If jsonable_encoder fails, try to locate the problematic subkey
        problem_paths = []
        def find_problems(obj, path="root", depth=0):
          from fastapi.encoders import jsonable_encoder as je_local
          if depth>4:
            return
          if isinstance(obj, dict):
            for k, v in obj.items():
              try:
                enc_k = je_local(k)
                if isinstance(enc_k, dict):
                  problem_paths.append((path + str(k), 'key_encodes_to_dict'))
              except Exception as e_k:
                problem_paths.append((path + str(k), f'key_encode_error:{e_k}'))
              # recurse on value
              try:
                enc_v = je_local(v)
                if isinstance(enc_v, dict):
                  # still fine; recurse
                  find_problems(v, path + f"/{k}", depth+1)
              except Exception as e_v:
                problem_paths.append((path + f"/{k}", f'value_encode_error:{e_v}'))
          elif isinstance(obj, (list, tuple, set)):
            for idx, item in enumerate(list(obj)[:50]):
              try:
                _ = je_local(item)
              except Exception as e_item:
                problem_paths.append((path + f"[{idx}]",'item_encode_error:' + str(e_item)))
              find_problems(item, path + f"[{idx}]", depth+1)
        try:
          find_problems(payload)
        except Exception as ff:
          problem_paths.append(("diagnostic","find_problems_failed:" + str(ff)))
        import traceback
        tb = traceback.format_exc()
        # Summarize state to help debugging
        def summarize(obj, depth=0):
          if depth>2:
            return {'type': type(obj).__name__}
          if isinstance(obj, dict):
            keys = list(obj.keys())
            non_str_keys = [repr(k) for k in keys if not isinstance(k, str)]
            sample = {}
            for kk in keys[:5]:
              try:
                sample[str(kk)] = type(obj[kk]).__name__
              except Exception:
                sample[str(kk)] = 'error'
            return {'type': 'dict', 'len': len(keys), 'non_str_keys': non_str_keys, 'sample_values_types': sample}
          if isinstance(obj, (list, tuple, set)):
            return {'type': type(obj).__name__, 'len': len(obj)}
          return {'type': type(obj).__name__}
        summary = {}
        for k, v in state.items():
          try:
            summary[str(k)] = summarize(v, depth=0)
          except Exception as ex:
            summary[str(k)] = {'error': str(ex)}
        return {'ok': False, 'error': f'jsonable_encoder failed: {je}', 'traceback': tb, 'problems': problem_paths, 'state_summary': summary}
    except Exception as outer_e:
      import traceback
      tb = traceback.format_exc()
      return {'ok': False, 'error': f'unexpected serializaton diagnostics error: {outer_e}', 'traceback': tb}
  except Exception as e:
    import traceback
    tb = traceback.format_exc()
    return {'ok': False, 'error': str(e), 'traceback': tb}


@router.get('/ready')
@audit('ready')
async def ready():
  """Lightweight readiness endpoint used by container healthchecks.
  Returns 200 when YOLO model is loaded and (optionally) LLM presents model.
  """
  y = state.get('yolo', {})
  ll = state.get('llm', {})
  ok = (y.get('status') == 'ready')
  reason = None
  if not ok:
    reason = f"yolo.status={y.get('status')}"
  # Optionally include llm presence info (do not make readiness depend on it if not required)
  ll_present = ll.get('present') if isinstance(ll, dict) else False
  return {'ok': ok, 'ready': ok, 'yolo_status': y.get('status'), 'llm_present': bool(ll_present), 'reason': reason}

