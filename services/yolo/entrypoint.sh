#!/bin/bash
# Production entrypoint: Ollama + FastAPI unified stack
# Handles graceful shutdown (SIGTERM/SIGINT) and VRAM cleanup

set -euo pipefail

trap cleanup SIGTERM SIGINT EXIT

OLLAMA_PID=""
FASTAPI_PID=""

cleanup() {
  echo "🛑 Shutdown signal received, cleaning up..."
  [ -n "$FASTAPI_PID" ] && kill -TERM "$FASTAPI_PID" 2>/dev/null || true
  [ -n "$OLLAMA_PID" ] && kill -TERM "$OLLAMA_PID" 2>/dev/null || true
  wait 2>/dev/null || true
  echo "✅ Cleanup complete"
  exit 0
}

MODELS_DIR="/app/models"
YOLO_MODEL="${MODELS_DIR}/yolo11n-seg.pt"
OLLAMA_MODEL="${OLLAMA_MODEL:-qwen2.5vl:7b}"

echo "🚀 Starting unified Vision AI stack (RTX 3090 optimized)"

# GPU check
python3 -c "
import torch
assert torch.cuda.is_available(), 'GPU required'
print(f'✅ GPU: {torch.cuda.get_device_name(0)} ({torch.cuda.get_device_properties(0).total_memory/1024**3:.1f}GB)')
" || exit 1

# Auto-download YOLO model
mkdir -p "${MODELS_DIR}"
if [ ! -f "${YOLO_MODEL}" ]; then
  echo "📥 Downloading YOLOv11-seg..."
  python3 -c "
from ultralytics import YOLO
import shutil
from pathlib import Path
YOLO('yolo11n-seg.pt')
for p in Path.home().glob('**/yolo11n-seg.pt'):
  shutil.copy(p, '${YOLO_MODEL}')
  break
"
  echo "✅ YOLOv11 ready"
fi

# Pre-warm YOLO so /models shows it as loaded
if [ -f "${YOLO_MODEL}" ]; then
  echo "⏱ Pre-warming YOLO model (fast)"
  python3 - <<PY || true
try:
  import time
  from detect_corners import get_yolo_model
  t0 = time.time()
  m = get_yolo_model()
  t1 = time.time()
  print('YOLO pre-warm: loaded=', bool(m), 'took_ms=', int((t1-t0)*1000))
except Exception as e:
  print('YOLO pre-warm failed:', e)
PY
else
  echo "⚠️  YOLO model not found, skipping pre-warm"
fi

# Start Ollama daemon
echo "🧠 Starting Ollama daemon..."
ollama serve &>/tmp/ollama.log &
OLLAMA_PID=$!

# Wait for Ollama API
for i in {1..60}; do
  if curl -sf http://127.0.0.1:11434/api/tags >/dev/null 2>&1; then
    echo "✅ Ollama API ready"
    break
  fi
  sleep 1
done

# Pull and lock model in VRAM with keep_alive=-1
# Honor OLLAMA_AUTO_PULL=0 to avoid downloading large models on container start
OLLAMA_AUTO_PULL="${OLLAMA_AUTO_PULL:-1}"
echo "⬇️ Checking for ${OLLAMA_MODEL} locally... (OLLAMA_AUTO_PULL=${OLLAMA_AUTO_PULL})"
if [ "$OLLAMA_AUTO_PULL" = "0" ] || [ "$OLLAMA_AUTO_PULL" = "false" ]; then
  echo "⚠️ OLLAMA_AUTO_PULL=${OLLAMA_AUTO_PULL} -> skipping automatic pull of ${OLLAMA_MODEL}"
else
  if ollama list 2>/dev/null | grep -F -q "${OLLAMA_MODEL}"; then
    echo "ℹ️ Model ${OLLAMA_MODEL} already present locally, skipping pull"
  else
    echo "⬇️ Pulling ${OLLAMA_MODEL}..."
    if ! ollama pull "${OLLAMA_MODEL}"; then
      echo "⚠️ Failed to pull ${OLLAMA_MODEL}, continuing without it"
    fi
  fi
fi

echo "🔥 Warming ${OLLAMA_MODEL} with keep_alive=-1 (permanent VRAM lock)..."
curl -sf http://127.0.0.1:11434/api/generate -d '{
  "model": "'"${OLLAMA_MODEL}"'",
  "prompt": "Test",
  "keep_alive": -1,
  "stream": false
}' >/dev/null || echo "ℹ️ Warm request returned non-zero; model may already be loaded or warm failed"

echo "✅ ${OLLAMA_MODEL} locked in VRAM (or warm attempted)"

# Start FastAPI
echo "🎯 Starting FastAPI..."
uvicorn detect_corners:app --host 0.0.0.0 --port 8000 --workers 1 &
FASTAPI_PID=$!

echo "🎉 Stack ready. Waiting for signals..."
wait $FASTAPI_PID
