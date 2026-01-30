#!/bin/bash
# Simplified entrypoint: just ollama serve & uvicorn

set -euo pipefail

trap cleanup SIGTERM SIGINT EXIT

OLLAMA_PID=""
FASTAPI_PID=""

cleanup() {
  [ -n "$FASTAPI_PID" ] && kill -TERM "$FASTAPI_PID" 2>/dev/null || true
  [ -n "$OLLAMA_PID" ] && kill -TERM "$OLLAMA_PID" 2>/dev/null || true
  wait 2>/dev/null || true
}

# GPU check
python3 -c "
import torch
assert torch.cuda.is_available(), 'GPU required'
print(f'✅ GPU: {torch.cuda.get_device_name(0)}')
"

# Start Ollama
ollama serve &
OLLAMA_PID=$!

# Wait for Ollama
for i in {1..30}; do
  curl -sf http://127.0.0.1:11434/api/tags >/dev/null && break
  sleep 1
done

# Start FastAPI
uvicorn app_main:app --host 0.0.0.0 --port 8000 --workers 4 --loop uvloop &
FASTAPI_PID=$!

wait $FASTAPI_PID
