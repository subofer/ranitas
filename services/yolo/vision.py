from fastapi import APIRouter, File, UploadFile, HTTPException
from pydantic import BaseModel
import numpy as np
import cv2
import os
import asyncio

try:
    from status import update_yolo_status
except Exception:
    update_yolo_status = lambda *args: None

router = APIRouter()

# YOLO model
_YOLO = None
MODEL_PATH = os.environ.get('YOLO_MODEL_PATH', '/app/models/yolov26l-seg.pt')

try:
    from ultralytics import YOLO
except Exception:
    YOLO = None

async def load_yolo():
    global _YOLO
    try:
        print('🚀 Iniciando carga de YOLO...', flush=True)
        update_yolo_status('loading')
        if YOLO is None:
            raise RuntimeError('Ultralytics YOLO not available')
        
        print(f'📦 Cargando modelo YOLO desde {MODEL_PATH}...', flush=True)
        _YOLO = YOLO(MODEL_PATH)
        
        print('🎮 Moviendo modelo a GPU...', flush=True)
        _YOLO.to('cuda:0')
        
        print('🔥 Realizando warmup del modelo...', flush=True)
        dummy = np.zeros((640, 640, 3), dtype=np.uint8)
        _YOLO.predict(dummy, verbose=False)
        
        print('✅ YOLO listo y operativo!', flush=True)
        update_yolo_status('ready', MODEL_PATH)
    except Exception as e:
        print(f'❌ Error cargando YOLO: {e}', flush=True)
        update_yolo_status('error')
        raise

class WarpRequest(BaseModel):
    image: bytes  # base64 encoded? Wait, for simplicity, use UploadFile
    points: list[list[int]]  # [[x1,y1], [x2,y2], [x3,y3], [x4,y4]]

def detect_document_corners_opencv(img_np):
    gray = (0.299 * img_np[:, :, 2] + 0.587 * img_np[:, :, 1] + 0.114 * img_np[:, :, 0]).astype('uint8')
    blurred = cv2.GaussianBlur(gray, (5, 5), 0)
    edged = cv2.Canny(blurred, 50, 150)
    contours, _ = cv2.findContours(edged, cv2.RETR_LIST, cv2.CHAIN_APPROX_SIMPLE)
    if not contours:
        return None
    h, w = img_np.shape[:2]
    best = None
    best_area = 0
    for cnt in contours:
        area = cv2.contourArea(cnt)
        if area < (w * h * 0.01) or area > (w * h * 0.95):
            continue
        epsilon = 0.02 * cv2.arcLength(cnt, True)
        approx = cv2.approxPolyDP(cnt, epsilon, True)
        if len(approx) == 4 and area > best_area:
            best = approx.reshape(-1, 2)
            best_area = area
    if best is not None:
        return _order_corners(best)
    return None

def _order_corners(pts):
    pts = np.array(pts).reshape(-1, 2)
    s = pts.sum(axis=1)
    diff = np.diff(pts, axis=1).reshape(-1)
    return [
        tuple(map(int, pts[np.argmin(s)])),
        tuple(map(int, pts[np.argmin(diff)])),
        tuple(map(int, pts[np.argmax(s)])),
        tuple(map(int, pts[np.argmax(diff)])),
    ]

def _detect_from_bytes(contents: bytes):
    try:
        nparr = np.frombuffer(contents, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        if img is None:
            return {'ok': False, 'error': 'invalid image'}
        pts = detect_document_corners_opencv(img)
        if pts is None:
            return {'ok': False, 'error': 'no_corners'}
        return {'ok': True, 'points': pts}
    except Exception as e:
        return {'ok': False, 'error': str(e)}

@router.post('/detect')
async def detect(file: UploadFile = File(...)):
    try:
        contents = await file.read()
        return _detect_from_bytes(contents)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post('/warp')
async def warp(file: UploadFile = File(...), points: str = None):  # points as JSON string for simplicity
    try:
        import json
        pts = json.loads(points) if points else None
        if not pts or len(pts) != 4:
            raise HTTPException(status_code=400, detail='Need 4 points')
        contents = await file.read()
        nparr = np.frombuffer(contents, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        if img is None:
            raise HTTPException(status_code=400, detail='Invalid image')
        h, w = img.shape[:2]
        dst_pts = np.array([[0, 0], [w, 0], [w, h], [0, h]], dtype=np.float32)
        src_pts = np.array(pts, dtype=np.float32)
        M = cv2.getPerspectiveTransform(src_pts, dst_pts)
        warped = cv2.warpPerspective(img, M, (w, h))
        # Encode to bytes
        success, encoded = cv2.imencode('.jpg', warped)
        if not success:
            raise HTTPException(status_code=500, detail='Encoding failed')
        return {'ok': True, 'image': encoded.tobytes()}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get('/health')
async def health():
    return {'ok': True, 'yolo_loaded': _YOLO is not None, 'model_path': MODEL_PATH}
