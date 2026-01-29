#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
# create venv if not exists
if [ ! -d "services/yolo/.venv" ]; then
  python3 -m venv services/yolo/.venv
fi
source services/yolo/.venv/bin/activate
pip install -r services/yolo/requirements.txt
# Ensure YOLO model path is set or file exists in services/yolo/
if [ -z "${YOLO_MODEL_PATH:-}" ]; then
  if [ ! -f services/yolo/yolov26l-seg.pt ]; then
    echo "WARNING: YOLO_MODEL_PATH not set and services/yolo/yolo26n-seg.pt not found"
    echo "Place the model or set YOLO_MODEL_PATH env var"
  fi
fi
# Run uvicorn
exec services/yolo/.venv/bin/uvicorn services.yolo.detect_corners:app --host 127.0.0.1 --port 8000 --workers 1
