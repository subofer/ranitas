"""Background monitor service (top-level) that exposes /status endpoints.
This implementation follows the new architecture rules: async-safe, non-blocking GET /status
and uses pynvml (nvidia-ml-py) when available for GPU metrics, fallback to torch if needed.
"""
from fastapi import APIRouter
import threading
import time
import traceback
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
    """Improved log helper:
    - Dedupes identical messages within a short window
    - Highlights errors (red color in terminals)
    - Prints a short summary if a previous message was repeated
    - Stores logs in an internal buffer for /logs
    """
    try:
        formatted = f"{icon} {tag} {msg}"
        now = time.time()
        # determine level heuristically
        level = 'info'
        if '❌' in icon or 'error' in str(msg).lower():
            level = 'error'
        elif '⚠️' in icon or 'warn' in str(msg).lower():
            level = 'warn'

        # push to buffer always
        _push_buffer(level, tag, formatted)

        # If same message within window, increment counter and suppress immediate print
        if _LAST_LOG['msg'] == formatted and (now - _LAST_LOG['ts']) < 5:
            _LAST_LOG['count'] += 1
            return

        # If a previous message was repeated, flush a summary before printing new message
        if _LAST_LOG['count'] > 1 and _LAST_LOG['msg'] != formatted:
            print(f"⤴️ (previous message repeated {_LAST_LOG['count']} times) {_LAST_LOG['msg']}")

        # Highlight errors
        if level == 'error':
            RED = '\033[91m'; RESET = '\033[0m'
            print(f"{RED}{formatted}{RESET}")
        else:
            print(formatted)

        # Update last log
        _LAST_LOG['msg'] = formatted
        _LAST_LOG['ts'] = now
        _LAST_LOG['count'] = 1
    except Exception:
        # Fallback to safe print
        try:
            print(f"{icon} {tag} {msg}")
        except Exception:
            pass


def get_logs(n=200):
    out = _LOG_BUFFER[-n:]
    return [{'ts': time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime(int(r['ts']))), 'level': r['level'], 'tag': r['tag'], 'msg': r['msg']} for r in out]

try:
    # prefer pynvml (provided by nvidia-ml-py)
    import pynvml
    _log('pynvml available (nvidia-ml-py) will be used', '📊', '[STATUS]')
    PYNVML = True
    try:
        pynvml.nvmlInit()
    except Exception:
        _log('pynvml.nvmlInit failed', '❌', '[STATUS]')
        PYNVML = False
except Exception:
    PYNVML = False

try:
    import psutil
except Exception:
    psutil = None

try:
    import httpx
except Exception:
    httpx = None

# Fallback GPU via torch
try:
    import torch
except Exception:
    torch = None

router = APIRouter()

# Shared monitor state (updated by BackgroundMonitor)
_MONITOR: Dict[str, Any] = {
    'vram_used': None,
    'vram_total': None,
    'system_ram': None,
    'cpu_usage': None,
    'service_health': {},
    'last_updated': None
}

# List of services to check (internal HTTP endpoints)
_SERVICES = {
    'vision': {'url': 'http://127.0.0.1:8000/vision/health'},
    'llm': {'url': 'http://127.0.0.1:8000/llm/health'}
}

@router.get('/')
async def status():
    """Return the last snapshot immediately (no waiting)."""
    return dict(_MONITOR)

@router.get('/compact')
async def compact():
    m = _MONITOR
    gpu = m.get('vram_total') and (m.get('vram_total')) or '—'
    models = m.get('service_health', {})
    # Model list is not tracked here; keep simple
    line = f"Hard: {gpu} • Modelos: —"
    return {'ok': True, 'line': line}

@router.get('/hardware')
async def hardware():
    return {'ok': True, 'vram_used': _MONITOR.get('vram_used'), 'vram_total': _MONITOR.get('vram_total'), 'cpu': _MONITOR.get('cpu_usage'), 'system_ram': _MONITOR.get('system_ram')}

@router.get('/services')
async def services():
    return {'ok': True, 'services': _MONITOR.get('service_health')}

@router.get('/logs')
async def logs(n: int = 200, container: str | None = None, tail: int = 200):
    """Return last n monitor logs (from internal buffer) and optionally docker logs for containers 'ranitas-vision' and 'ranitas-postgres'."""
    # local buffer
    try:
        local = get_logs(n)
    except Exception:
        local = []

    docker_logs = None
    if container in ('vision', 'postgres'):
        import subprocess, shlex
        cname = 'ranitas-vision' if container == 'vision' else 'ranitas-postgres'
        try:
            cmd = f"docker logs --tail {tail} {cname}"
            proc = subprocess.run(shlex.split(cmd), capture_output=True, text=True, timeout=4)
            if proc.returncode == 0:
                docker_logs = proc.stdout.splitlines()[-tail:]
            else:
                docker_logs = [proc.stderr or f'docker logs failed code {proc.returncode}']
        except Exception as e:
            docker_logs = [f'Error fetching docker logs: {e}']

    return {'ok': True, 'logs': local, 'docker_logs': docker_logs}


class BackgroundMonitor:
    def __init__(self, interval: float = 5.0):
        """Default interval is 5s to avoid very frequent status noise. Can be overridden with RANITAS_STATUS_INTERVAL env var."""
        self.interval = interval
        self._stop = False
        self.thread = threading.Thread(target=self._loop, daemon=True)

    def start(self):
        _log('Starting BackgroundMonitor', '📊', '[STATUS]')
        self.thread.start()

    def stop(self):
        self._stop = True
        _log('Stopping BackgroundMonitor', '📊', '[STATUS]')

    def _gpu_stats(self):
        try:
            if PYNVML:
                handle = pynvml.nvmlDeviceGetHandleByIndex(0)
                mem = pynvml.nvmlDeviceGetMemoryInfo(handle)
                used = round(mem.used / 1024**3, 1)
                total = round(mem.total / 1024**3, 1)
                return used, total
            elif torch and torch.cuda.is_available():
                try:
                    free, tot = torch.cuda.mem_get_info()
                    used = round((tot - free) / 1024**3, 1)
                    total = round(torch.cuda.get_device_properties(0).total_memory / 1024**3, 1)
                    return used, total
                except Exception:
                    return None, None
        except Exception:
            _log(traceback.format_exc(), '❌', '[STATUS]')
        return None, None

    def _service_ping(self, url: str) -> bool:
        try:
            if httpx:
                with httpx.Client(timeout=1.0) as c:
                    r = c.get(url)
                    return r.status_code == 200
            else:
                # minimal fallback using requests
                import requests
                r = requests.get(url, timeout=1.0)
                return r.status_code == 200
        except Exception:
            return False

    def _loop(self):
        while not self._stop:
            try:
                v_used, v_total = self._gpu_stats()
                if v_used is not None:
                    _MONITOR['vram_used'] = v_used
                if v_total is not None:
                    _MONITOR['vram_total'] = v_total

                if psutil:
                    vm = psutil.virtual_memory()
                    _MONITOR['system_ram'] = {'total': vm.total, 'available': vm.available, 'percent': vm.percent}
                    _MONITOR['cpu_usage'] = psutil.cpu_percent(interval=None)
                else:
                    _MONITOR['system_ram'] = None
                    _MONITOR['cpu_usage'] = None

                # service health quick pings
                health = {}
                for name, info in _SERVICES.items():
                    ok = self._service_ping(info['url'])
                    health[name] = {'ok': ok}
                _MONITOR['service_health'] = health
                _MONITOR['last_updated'] = time.time()
            except Exception:
                _log('Exception in monitor loop:\n' + traceback.format_exc(), '❌', '[STATUS]')
            time.sleep(self.interval)


# NOTE: Auto-starting BackgroundMonitor at import time can create multiple monitors
# when the package is imported from different module paths. To avoid race conditions,
# auto-start is disabled by default. Set env var RANITAS_AUTO_START_MONITOR=1 to enable.

import os
_AUTO_START = os.getenv('RANITAS_AUTO_START_MONITOR', '0').lower() in ('1', 'true', 'yes')
_MON = BackgroundMonitor(interval=float(os.getenv('RANITAS_STATUS_INTERVAL', '5.0')))
if _AUTO_START:
    _log('Auto-starting BackgroundMonitor (via RANITAS_AUTO_START_MONITOR)', '⚠️', '[STATUS]')
    _MON.start()
else:
    _log('BackgroundMonitor auto-start disabled. start_monitor() must be called explicitly', '⚠️', '[STATUS]')


def start_monitor():
    # idempotent start
    global _MON
    if not _MON.thread.is_alive():
        _MON = BackgroundMonitor()
        _MON.start()

