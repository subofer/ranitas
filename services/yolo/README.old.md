YOLO Document Corner Detector

Quick start (development):

1) Create a Python venv and install deps:
   python -m venv .venv
   source .venv/bin/activate
   pip install -r requirements.txt

2) Place your `yolo26n-seg.pt` model file and set env var if not in same folder:
   export YOLO_MODEL_PATH=/path/to/yolo26n-seg.pt

3) Run the service on port 8000 (GPU required for fastest inference):
   uvicorn services.yolo.detect_corners:app --host 127.0.0.1 --port 8000 --workers 1

Endpoint: POST /detect (multipart/form-data, field `image`)
Returns JSON with `points`, `debug_image_base64`, `model`, `timing_ms`.

Notes:
- The service attempts to detect a documented contour and simplify to 4 points using cv2.approxPolyDP.
- If no confident quad found, returns `ok: false` and `fallback` rectangle (10% margins).
