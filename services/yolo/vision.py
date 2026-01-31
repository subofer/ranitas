from fastapi import APIRouter, File, UploadFile, HTTPException
import numpy as np
import cv2
import os
import base64
router = APIRouter()

# --- CONFIGURACIÓN GLOBAL ---
import os
MODEL_PATH = os.environ.get('YOLO_MODEL_PATH', '/app/models/yoloe-26x-seg.pt')
PROMPT_CLASSES = ["invoice", "piece of paper", "printed document", "receipt"]
_MODEL = None

# NOTE: The model is loaded asynchronously by `loader.ensure_and_load_all()` at startup.
# Vision endpoints should handle the case when `_MODEL` is None (still loading or missing).

def _order_points(pts):
    """Ordena 4 puntos en: Top-Left, Top-Right, Bottom-Right, Bottom-Left"""
    rect = np.zeros((4, 2), dtype="float32")
    s = pts.sum(axis=1)
    rect[0] = pts[np.argmin(s)]      # TL
    rect[2] = pts[np.argmax(s)]      # BR
    diff = np.diff(pts, axis=1)
    rect[1] = pts[np.argmin(diff)]   # TR
    rect[3] = pts[np.argmax(diff)]   # BL
    return rect

def get_four_corners(polygon_points, w, h):
    """Simplifica la máscara de YOLO a 4 esquinas"""
    pts = (np.array(polygon_points) * [w, h]).astype(np.float32)
    epsilon = 0.02 * cv2.arcLength(pts, True)
    approx = cv2.approxPolyDP(pts, epsilon, True)

    if len(approx) == 4:
        corners = approx.reshape(4, 2)
    else:
        # Si la máscara no es perfecta, usamos el rectángulo de área mínima
        rect = cv2.minAreaRect(pts)
        corners = cv2.boxPoints(rect)
    
    return _order_points(corners)

@router.post('/crop')
async def crop_document(file: UploadFile = File(...)):
    """Detecta, endereza y devuelve la info + imagen escaneada"""
    # Quick debug: ensure numpy importable and print version (helps diagnose runtime import issues)
    try:
        import numpy as _np
        print(f"🧪 numpy version in worker: {_np.__version__}")
    except Exception as _e:
        print(f"❌ numpy import failed in worker: {_e}")
        raise HTTPException(status_code=500, detail=str(_e))

    if _MODEL is None:
            # Prefer returning a 503-like response indicating the model is not ready
            raise HTTPException(status_code=503, detail="Modelo YOLO no cargado o en carga (intente nuevamente más tarde)")
    try:
        # 1. Leer imagen
        contents = await file.read()
        nparr = np.frombuffer(contents, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        if img is None:
            raise HTTPException(status_code=400, detail="Imagen inválida")
        
        h, w = img.shape[:2]

        # 2. Inferencia YOLO26-seg
        results = _MODEL.predict(img, conf=0.3, retina_masks=True, verbose=False)
        result = results[0]

        if not result.masks:
            return {"ok": False, "error": "No se detectó el documento"}

        # 3. Obtener esquinas reales (píxeles)
        src_pts = get_four_corners(result.masks.xyn[0], w, h)

        # 4. Calcular dimensiones del documento para el Warp
        # Usamos la distancia entre puntos para que el recorte sea proporcional
        width_top = np.linalg.norm(src_pts[1] - src_pts[0])
        width_btm = np.linalg.norm(src_pts[2] - src_pts[3])
        max_w = max(int(width_top), int(width_btm))

        height_left = np.linalg.norm(src_pts[3] - src_pts[0])
        height_right = np.linalg.norm(src_pts[2] - src_pts[1])
        max_h = max(int(height_left), int(height_right))

        # 5. Aplicar Transformación de Perspectiva
        dst_pts = np.array([
            [0, 0],
            [max_w - 1, 0],
            [max_w - 1, max_h - 1],
            [0, max_h - 1]
        ], dtype="float32")

        M = cv2.getPerspectiveTransform(src_pts, dst_pts)
        warped = cv2.warpPerspective(img, M, (max_w, max_h))

        # 6. Encode a Base64
        _, buffer = cv2.imencode('.jpg', warped, [cv2.IMWRITE_JPEG_QUALITY, 90])
        encoded_img = base64.b64encode(buffer).decode('utf-8')

        return {
            "ok": True,
            "detected": (PROMPT_CLASSES[int(result.boxes.cls[0])] if hasattr(result, 'boxes') and len(result.boxes) > 0 else None),
            "confidence": (float(result.boxes.conf[0]) if hasattr(result, 'boxes') and len(result.boxes) > 0 else None),
            "corners_normalized": [[float(p[0]/w), float(p[1]/h)] for p in src_pts],
            "image": encoded_img
        }

    except Exception as e:
        import traceback, sys
        tb = traceback.format_exc()
        print(f"❌ Exception in /vision/crop: {e}\n{tb}", file=sys.stderr)
        raise HTTPException(status_code=500, detail=str(e))

@router.get('/health')
async def health():
    return {'ok': True, 'yolo_loaded': _MODEL is not None, 'model_path': MODEL_PATH}

@router.get('/debug/numpy')
async def debug_numpy():
    try:
        import numpy as np
        return {'ok': True, 'numpy': np.__version__}
    except Exception as e:
        return {'ok': False, 'error': str(e)}
