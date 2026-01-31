#!/usr/bin/env bash
set -euo pipefail

# Entrypoint para 'vision' - descarga modelos, chequea GPU, arranca Ollama y FastAPI con logs claros

SCRIPTS_DIR="/app/scripts"
OLLAMA_PID=""

log() {
  ts=$(date --iso-8601=seconds)
  echo "[$ts] [vision] $*"
}

cleanup() {
  log "Shutting down..."
  [ -n "$OLLAMA_PID" ] && kill -TERM "$OLLAMA_PID" 2>/dev/null || true
  wait 2>/dev/null || true
  exit 0
}
trap cleanup SIGTERM SIGINT EXIT

# 1) Prepare models (download if configured)
if [ -x "$SCRIPTS_DIR/download_models.sh" ]; then
  log "Preparing models..."
  "$SCRIPTS_DIR/download_models.sh"
else
  log "No download script found, skipping model auto-download"
fi

# 2) Check GPU (optional via REQUIRE_GPU env var)
if [ -x "$SCRIPTS_DIR/check_gpu.py" ]; then
  if python3 "$SCRIPTS_DIR/check_gpu.py"; then
    log "GPU check passed"
  else
    if [ "${REQUIRE_GPU:-true}" = "true" ]; then
      log "ERROR: GPU required but not available"
      exit 1
    else
      log "GPU check failed but REQUIRE_GPU=false, continuing"
    fi
  fi
else
  log "GPU check script not found, skipping"
fi

# 3) Ensure ultralytics cache files (mobileclip) if present in mounted model dirs or specified path
install_mobileclip() {
  TARGET="${MOBILECLIP_PATH:-}"
  if [ -n "$TARGET" ] && [ -f "$TARGET" ]; then
    mkdir -p /root/.cache/ultralytics
    cp "$TARGET" /root/.cache/ultralytics/ || true
    log "mobileclip cache installed from MOBILECLIP_PATH=${TARGET}"
    return 0
  fi

  # Search common mount points for mobileclip2_b.ts
  CANDIDATES="/app/models /models /app/model_files /mnt/models /data/models ./models ./services/yolo/models"
  for d in $CANDIDATES; do
    if [ -f "$d/mobileclip2_b.ts" ]; then
      mkdir -p /root/.cache/ultralytics
      cp "$d/mobileclip2_b.ts" /root/.cache/ultralytics/ || true
      log "mobileclip cache installed from ${d}/mobileclip2_b.ts"
      return 0
    fi
  done

  # Last resort: run a fast find (limit to file system root and depth)
  PATH_FOUND=$(find / -xdev -type f -name mobileclip2_b.ts -maxdepth 5 2>/dev/null | head -n1 || true)
  if [ -n "$PATH_FOUND" ]; then
    mkdir -p /root/.cache/ultralytics
    cp "$PATH_FOUND" /root/.cache/ultralytics/ || true
    log "mobileclip cache installed (found at $PATH_FOUND)"
    return 0
  fi

  log "mobileclip2_b.ts not found in expected locations"
}

install_mobileclip

# 4) Setup YOLO config dir
mkdir -p /tmp/ultralytics
cat > /tmp/ultralytics/settings.json << EOF
{
  "settings_version": "0.0.6",
  "datasets_dir": "/tmp/ultralytics/datasets",
  "weights_dir": "/tmp/ultralytics/weights", 
  "runs_dir": "/tmp/ultralytics/runs",
  "uuid": "00000000-0000-0000-0000-000000000000",
  "sync": false,
  "api_key": "",
  "openai_api_key": "",
  "clearml": false,
  "comet": false,
  "dvc": false,
  "hub": false,
  "mlflow": false,
  "neptune": false,
  "raytune": false,
  "tensorboard": false,
  "wandb": false
}
EOF

# 5) Start Ollama (visible logs)
OLLAMA_TIMEOUT=${OLLAMA_TIMEOUT:-60}
log "Starting Ollama (timeout ${OLLAMA_TIMEOUT}s)"
ollama serve &
OLLAMA_PID=$!

# Wait for Ollama to be ready
i=0
until curl -sf http://127.0.0.1:11434/api/tags >/dev/null; do
  sleep 1
  i=$((i+1))
  if [ $i -ge $OLLAMA_TIMEOUT ]; then
    log "❌ Ollama did not become healthy within ${OLLAMA_TIMEOUT}s"
    break
  fi
done

if curl -sf http://127.0.0.1:11434/api/tags >/dev/null; then
  log "✅ Ollama is up"
  # Optionally pull model into Ollama if configured
  if [ "${OLLAMA_AUTO_PULL:-0}" = "1" ] && [ -n "${OLLAMA_MODEL:-}" ]; then
    log "Pulling Ollama model ${OLLAMA_MODEL}"
    curl -sSf -X POST http://127.0.0.1:11434/api/pull -H 'Content-Type: application/json' -d "{\"name\": \"${OLLAMA_MODEL}\"}" || log "⚠️ Failed to pull Ollama model ${OLLAMA_MODEL}"
  fi
else
  log "⚠️ Ollama not available; continuing startup — LLM endpoints may fail"
fi

# 6) Start FastAPI using exec so it receives signals
UVICORN_WORKERS=${UVICORN_WORKERS:-1}
log "Starting FastAPI (uvicorn workers=${UVICORN_WORKERS})"
exec uvicorn app_main:app --host 0.0.0.0 --port 8000 --workers ${UVICORN_WORKERS} --loop uvloop --log-level info
