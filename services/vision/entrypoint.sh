#!/usr/bin/env bash
set -euo pipefail

timestamp() { date -u +"%Y-%m-%dT%H:%M:%SZ"; }
log() { printf "[%s] %s\n" "$(timestamp)" "$*"; }

print_usage() {
  cat <<EOF
Usage: $0 [command]

Commands:
  info       Print runtime diagnostics and exit ✅
  help       Show this help text
  shell      Drop into a shell (exec /bin/bash)
  (no args)  Start the service (Ollama if available + uvicorn)

At runtime you can check the service at: http://<host>:8000/status
EOF
}

print_info() {
  log "Vision service info"
  log "ENV: VISION_MODEL=${VISION_MODEL:-/app/models/yoloe-26x-seg.pt} LLM_MODEL=${LLM_MODEL:-qwen2.5vl:7b} OLLAMA_HOST=${OLLAMA_HOST:-http://127.0.0.1:11434}"
  log "Python: $(python3 -V 2>&1 | tr -d '\n')"
  log "Pip packages:"
  for pkg in ultralytics torch pynvml requests; do
    python3 -c "import importlib,sys; m=importlib.util.find_spec('$pkg'); print('$pkg:', 'installed' if m else 'missing')" || true
  done
  log "Models directory (/app/models):"
  if [ -d /app/models ]; then
    ls -la /app/models | sed -n '1,200p'
  else
    log "/app/models not found"
  fi
  # Check configured model presence
  if [ -n "${VISION_MODEL:-}" ] && [ -f "${VISION_MODEL}" ]; then
    log "Configured VISION_MODEL exists: ${VISION_MODEL}"
  else
    log "WARNING: configured VISION_MODEL (${VISION_MODEL:-<unset>}) NOT found"
  fi
  # GPU check
  if command -v nvidia-smi >/dev/null 2>&1; then
    log "GPU detected via nvidia-smi:"; nvidia-smi --query-gpu=name,memory.total --format=csv,noheader,nounits | sed -n '1,5p'
  else
    python3 - <<'PY' 2>/dev/null || true
try:
  import pynvml
  pynvml.nvmlInit()
  h=pynvml.nvmlDeviceGetHandleByIndex(0)
  m=pynvml.nvmlDeviceGetMemoryInfo(h)
  print('GPU via pynvml: total', m.total)
except Exception as e:
  print('No GPU detected (pynvml error or missing)')
PY
  fi
  # Ollama check
  if command -v ollama >/dev/null 2>&1; then
    log "Ollama binary present"
    set +e
    curl -fsS --max-time 3 ${OLLAMA_HOST:-http://127.0.0.1:11434}/api/tags >/dev/null 2>&1
    if [ $? -eq 0 ]; then
      log "Ollama HTTP endpoint reachable at ${OLLAMA_HOST:-http://127.0.0.1:11434}"
    else
      log "Ollama binary present but service not responding at ${OLLAMA_HOST:-http://127.0.0.1:11434} (it may be starting)"
    fi
    set -e
  else
    log "Ollama binary not found in PATH"
  fi
  log "Health check (local): curl -fsS http://127.0.0.1:8000/status || true"
}

# Simple arg parsing
case "${1:-}" in
  info)
    print_info
    exit 0
    ;;
  help|-h|--help)
    print_usage
    exit 0
    ;;
  shell)
    exec /bin/bash
    ;;
  '')
    # proceed to normal start
    ;;
  *)
    # If user wants to run something else, exec it
    exec "$@"
    ;;
esac

# Print startup header
log "Starting vision service"

# Start Ollama if binary exists
if command -v ollama >/dev/null 2>&1; then
  log "Starting Ollama serve in background..."
  # Redirect oom messages to stdout/stderr to be visible in container logs
  ollama serve >/tmp/ollama.log 2>&1 &
  OLLAMA_PID=$!
  log "Ollama PID=${OLLAMA_PID}"
else
  log "Ollama not available; continuing without starting it"
fi

# Small wait to let Ollama start binding (monitor_ollama in app will keep checking anyway)
sleep 1

# Optionally auto-pull configured Ollama model into /root/.ollama (useful when using a host-mounted volume)
if [ "${OLLAMA_AUTO_PULL:-0}" = "1" ] && [ -n "${OLLAMA_MODEL:-}" ]; then
  log "OLLAMA_AUTO_PULL=1 — requesting Ollama to pull model ${OLLAMA_MODEL}"
  set +e
  curl -sSf -X POST "${OLLAMA_HOST:-http://127.0.0.1:11434}/api/pull" -H 'Content-Type: application/json' -d "{\"name\": \"${OLLAMA_MODEL}\"}" >/tmp/ollama-pull.log 2>&1
  if [ $? -eq 0 ]; then
    log "Ollama pull requested successfully"
  else
    log "Ollama pull request failed; check /tmp/ollama-pull.log or container logs"
  fi
  set -e
fi

# Print diagnostics summary (non-blocking)
print_info | sed -n '1,200p' || true

# Start uvicorn (exec to receive signals properly)
log "Starting uvicorn (main:app) on 0.0.0.0:8000"
exec uvicorn main:app --host 0.0.0.0 --port 8000 --workers 1 --app-dir /app
