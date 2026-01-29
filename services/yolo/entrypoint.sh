#!/bin/bash
# Production entrypoint: Ollama + FastAPI unified stack
# Handles graceful shutdown (SIGTERM/SIGINT) and VRAM cleanup

set -euo pipefail

trap cleanup SIGTERM SIGINT EXIT

# Unified log helper with millisecond timestamp
ts() { date +"%Y-%m-%d %H:%M:%S,%3N"; }
log() { echo "$(ts) $*"; }

OLLAMA_PID=""
FASTAPI_PID=""

cleanup() {
  log "🛑 Shutdown signal received, cleaning up..."
  [ -n "$FASTAPI_PID" ] && kill -TERM "$FASTAPI_PID" 2>/dev/null || true
  [ -n "$OLLAMA_PID" ] && kill -TERM "$OLLAMA_PID" 2>/dev/null || true
  wait 2>/dev/null || true
  log "✅ Cleanup complete"
  exit 0
}

MODELS_DIR="/app/models"
YOLO_MODEL="${MODELS_DIR}/yolov26l-seg.pt"
OLLAMA_MODEL="${OLLAMA_MODEL:-qwen2.5vl:7b}"

log "🚀 Starting unified Vision AI stack (RTX 3090 optimized)"

# GPU check
python3 -c "
import torch
assert torch.cuda.is_available(), 'GPU required'
print(f'✅ GPU: {torch.cuda.get_device_name(0)} ({torch.cuda.get_device_properties(0).total_memory/1024**3:.1f}GB)')
" || exit 1

# Auto-download YOLOv26 model (if not mounted)
mkdir -p "${MODELS_DIR}"
if [ ! -f "${YOLO_MODEL}" ]; then
  log "📥 Attempting to download YOLOv26 segmentation model inside container..."
  python3 - <<PY
from ultralytics import YOLO
import shutil
from pathlib import Path
# Try to request several candidate model names (some may be hosted differently across releases)
candidates_request = ['yolov26l-seg.pt', 'yoloe-26n-seg.pt', 'yolo26n-seg.pt', 'yolov26l.pt']
found = False
for name in candidates_request:
    try:
        print('Attempting to trigger download for', name)
        YOLO(name)
    except Exception as e:
        print('Trigger failed for', name, '->', e)
# Search common cache locations for the downloaded file using broad glob
globs = ['**/yol*26*seg*.pt', '**/yolo*26*seg*.pt', '**/*yolov26l*.pt']
candidates = []
# Check current dir, home dir, and known ultralytics cache locations
paths_to_check = [Path('.'), Path.home(), Path('/root/.cache/ultralytics'), Path('/tmp/Ultralytics')]
for base in paths_to_check:
    for g in globs:
        try:
            candidates.extend(list(base.glob(g)))
        except Exception:
            pass
# Deduplicate and sort by modification time (newest first)
candidates = sorted({p for p in candidates if p.exists()}, key=lambda p: p.stat().st_mtime, reverse=True)
if candidates:
    p = candidates[0]
    try:
        shutil.copy(p, '${YOLO_MODEL}')
        print('Copied', p, '->', '${YOLO_MODEL}')
        found = True
    except Exception as e:
        print('Could not copy downloaded model:', e)
else:
    print('No candidate model file found in cache or cwd; checked paths:', [str(p) for p in paths_to_check], 'and patterns', globs)
if not found:
    print('Manual action required: place yolov26l-seg.pt in', '${MODELS_DIR}')
# As a last resort, search ${MODELS_DIR} for any candidate model and symlink it to expected name
import os
from pathlib import Path
candidates2 = list(Path('${MODELS_DIR}').glob('*26*seg*.pt')) + list(Path('${MODELS_DIR}').glob('*26*.pt'))
if candidates2:
    src = candidates2[0]
    dst = Path('${YOLO_MODEL}')
    try:
        if not dst.parent.exists(): dst.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy(src, dst)
        print('Fallback: copied', src, '->', dst)
    except Exception as e:
        print('Fallback copying failed:', e)
PY
  if [ -f "${YOLO_MODEL}" ]; then
    log "✅ YOLOv26 model ready at ${YOLO_MODEL}"
  else
    log "⚠️ Could not obtain yolov26l-seg.pt automatically; ensure YOLO_MODEL_PATH or mount the file into ${MODELS_DIR}"
  fi
fi

# Pre-warm YOLO so /models shows it as loaded
if [ -f "${YOLO_MODEL}" ]; then
  log "⏱ Pre-warming YOLO model (fast)"
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
  log "⚠️  YOLO model not found, skipping pre-warm"
fi

# Start Ollama daemon
log "🧠 Starting Ollama daemon..."
ollama serve &>/tmp/ollama.log &
OLLAMA_PID=$!

# Wait for Ollama API
for i in {1..60}; do
  if curl -sf http://127.0.0.1:11434/api/tags >/dev/null 2>&1; then
    log "✅ Ollama API ready"
    break
  fi
  sleep 1
done

# Pull and lock model in VRAM with keep_alive=-1
# Honor OLLAMA_AUTO_PULL=0 to avoid downloading large models on container start
OLLAMA_AUTO_PULL="${OLLAMA_AUTO_PULL:-1}"
log "⬇️ Checking for ${OLLAMA_MODEL} locally... (OLLAMA_AUTO_PULL=${OLLAMA_AUTO_PULL})"
MODEL_PRESENT=0
if [ "$OLLAMA_AUTO_PULL" = "0" ] || [ "$OLLAMA_AUTO_PULL" = "false" ]; then
  log "⚠️ OLLAMA_AUTO_PULL=${OLLAMA_AUTO_PULL} -> skipping automatic pull of ${OLLAMA_MODEL}"
  if ollama list 2>/dev/null | grep -F -q "${OLLAMA_MODEL}"; then
    MODEL_PRESENT=1
    log "ℹ️ Model ${OLLAMA_MODEL} present locally"
  else
    MODEL_PRESENT=0
    log "⚠️ Model ${OLLAMA_MODEL} not present locally and auto-pull disabled"
  fi
else
  if ollama list 2>/dev/null | grep -F -q "${OLLAMA_MODEL}"; then
    MODEL_PRESENT=1
    log "ℹ️ Model ${OLLAMA_MODEL} already present locally, skipping pull"
  else
    log "⬇️ Pulling ${OLLAMA_MODEL}..."
    if ollama pull "${OLLAMA_MODEL}"; then
      MODEL_PRESENT=1
    else
      MODEL_PRESENT=0
      log "⚠️ Failed to pull ${OLLAMA_MODEL}, continuing without it"
    fi
  fi
fi

if [ "$MODEL_PRESENT" = "1" ]; then
  log "🔥 Warming ${OLLAMA_MODEL} with keep_alive=-1 (permanent VRAM lock)..."
  curl -sf http://127.0.0.1:11434/api/generate -d '{
    "model": "'"${OLLAMA_MODEL}"'",
    "prompt": "Test",
    "keep_alive": -1,
    "stream": false
  }' >/dev/null || log "ℹ️ Warm request returned non-zero; model may already be loaded or warm failed"
  log "✅ ${OLLAMA_MODEL} locked in VRAM (or warm attempted)"
else
  log "⚠️ Skipping warm: ${OLLAMA_MODEL} not present locally"
fi

# Start FastAPI
log "🎯 Starting FastAPI..."
uvicorn detect_corners:app --host 0.0.0.0 --port 8000 --workers 1 &
FASTAPI_PID=$!

log "🎉 Stack ready. Waiting for signals..."
wait $FASTAPI_PID
