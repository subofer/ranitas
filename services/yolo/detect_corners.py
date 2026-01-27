#!/usr/bin/env python3
"""FastAPI microservice to detect document corners using YOLOv11 segmentation on GPU.

- Endpoint: POST /detect
- Accepts multipart/form-data with field `image`.
- Returns JSON:
  { ok: true, points: [{x:..,y:..}, ...], debug_image_base64: "...", timing_ms: 123 }

Fallback: returns ok: false and fallback rectangle (10% margin) if no clear quad found.

Requirements: ultralytics, opencv-python, fastapi, uvicorn, numpy, pillow

Usage: set YOLO_MODEL_PATH env var or put yolo11n-seg.pt next to this file. Run:
  uvicorn services.yolo.detect_corners:app --host 127.0.0.1 --port 8000 --workers 1
"""

import os
import io
import time
import base64
import logging
from typing import Optional

from fastapi import FastAPI, File, UploadFile, HTTPException  # type: ignore[import]
from fastapi.responses import JSONResponse  # type: ignore[import]
from fastapi.middleware.cors import CORSMiddleware  # type: ignore[import]
from pydantic import BaseModel  # type: ignore[import]

try:
    import cv2  # type: ignore[import]
    import numpy as np  # type: ignore[import]
    from PIL import Image  # type: ignore[import]
    from ultralytics import YOLO  # type: ignore[import]
except Exception as e:
    # We'll handle missing deps at runtime and return clear messages
    cv2 = None
    np = None
    Image = None
    YOLO = None
    missing_import = str(e)

logger = logging.getLogger("yolo-detect")
logging.basicConfig(level=logging.INFO)

app = FastAPI(title="YOLO Document Corner Detector")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

MODEL_PATH = os.environ.get('YOLO_MODEL_PATH', os.path.join(os.path.dirname(__file__), 'yolo11n-seg.pt'))
CONFIDENCE = float(os.environ.get('YOLO_CONF', 0.25))
MASK_THRESHOLD = float(os.environ.get('MASK_THRESHOLD', 0.5))

# Lazy load models
_model = None
_docres_model = None

# Try import DocRes (document restoration model) optionally
try:
    from docres import DocRes  # type: ignore[import]
except Exception:
    DocRes = None

DOCRES_PATH = os.environ.get('DOCRES_MODEL_PATH', os.path.join(os.path.dirname(__file__), 'docres.pt'))


def get_docres_model():
    global _docres_model
    if _docres_model is None:
        if DocRes is None:
            # DocRes not installed in environment
            return None
        if not os.path.exists(DOCRES_PATH):
            # model not found
            return None
        logger.info(f"Loading DocRes model from {DOCRES_PATH}")
        try:
            _docres_model = DocRes(DOCRES_PATH)
        except Exception as e:
            logger.exception('Failed to load DocRes model: %s', e)
            _docres_model = None
    return _docres_model
def get_model():
    global _model
    if _model is None:
        if YOLO is None:
            raise RuntimeError(f"Missing dependencies: {missing_import}")
        if not os.path.exists(MODEL_PATH):
            raise RuntimeError(f"YOLO model not found at {MODEL_PATH}. Set YOLO_MODEL_PATH env or place the model file there.")
        logger.info(f"Loading YOLO model from {MODEL_PATH} onto device 0 (GPU)")
        _model = YOLO(MODEL_PATH)
    return _model


def order_corners(pts):
    # pts: Nx2 numpy array
    pts = np.array(pts).reshape(-1, 2)
    s = pts.sum(axis=1)
    diff = np.diff(pts, axis=1).reshape(-1)
    tl = pts[np.argmin(s)]
    br = pts[np.argmax(s)]
    tr = pts[np.argmin(diff)]
    bl = pts[np.argmax(diff)]
    ordered = [tuple(map(int, tl)), tuple(map(int, tr)), tuple(map(int, br)), tuple(map(int, bl))]
    return ordered


def polygon_touches_edge(pts, w, h, tol=3):
    """Return True if polygon points touch or are very close to image edges."""
    if pts is None:
        return False
    pts = np.array(pts).reshape(-1, 2)
    if pts.size == 0:
        return False
    xs = pts[:, 0]
    ys = pts[:, 1]
    return xs.min() <= tol or ys.min() <= tol or xs.max() >= (w - tol) or ys.max() >= (h - tol)


def preprocess_image(img_np):
    """Apply subtle contrast and sharpening to improve detection robustness.
    Uses CLAHE on the L channel and a gentle unsharp mask. Non-destructive and conservative."""
    try:
        lab = cv2.cvtColor(img_np, cv2.COLOR_BGR2LAB)
        l, a, b = cv2.split(lab)
        clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
        l2 = clahe.apply(l)
        lab2 = cv2.merge((l2, a, b))
        img_clahe = cv2.cvtColor(lab2, cv2.COLOR_LAB2BGR)

        # Slight unsharp mask (subtle sharpening)
        blurred = cv2.GaussianBlur(img_clahe, (0, 0), sigmaX=1.0)
        sharpened = cv2.addWeighted(img_clahe, 1.12, blurred, -0.12, 0)
        return sharpened
    except Exception:
        # If any step fails, return the original image
        return img_np



def fallback_rect(w, h, margin=0.1):
    m = margin
    return [
        {"x": int(m * w), "y": int(m * h)},
        {"x": int((1 - m) * w), "y": int(m * h)},
        {"x": int((1 - m) * w), "y": int((1 - m) * h)},
        {"x": int(m * w), "y": int((1 - m) * h)},
    ]


def restore_fallback(img_np):
    """A conservative restoration pipeline when DocRes model is not available.
    - Convert to LAB and apply gentle CLAHE on L channel
    - Use morphological closing and background subtraction to reduce shadows/folds
    - Denoise with fastNlMeansDenoisingColored
    - Return restored BGR image
    """
    try:
        # CLAHE on L
        lab = cv2.cvtColor(img_np, cv2.COLOR_BGR2LAB)
        l, a, b = cv2.split(lab)
        clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8,8))
        l2 = clahe.apply(l)
        lab2 = cv2.merge((l2, a, b))
        img_clahe = cv2.cvtColor(lab2, cv2.COLOR_LAB2BGR)

        # Shadow removal: approximate background by large closing and subtract
        gray = cv2.cvtColor(img_clahe, cv2.COLOR_BGR2GRAY)
        kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (61,61))
        bg = cv2.morphologyEx(gray, cv2.MORPH_CLOSE, kernel)
        diff = cv2.subtract(bg, gray)
        norm = cv2.normalize(diff, None, alpha=0, beta=255, norm_type=cv2.NORM_MINMAX)
        mask = cv2.threshold(norm, 30, 255, cv2.THRESH_BINARY)[1]
        mask = cv2.GaussianBlur(mask, (21,21), 0)
        mask3 = cv2.cvtColor(mask, cv2.COLOR_GRAY2BGR).astype(float)/255.0

        # Blend the image with a version with increased brightness where shadow suspected
        brighten = cv2.addWeighted(img_clahe, 1.08, cv2.GaussianBlur(img_clahe, (0,0), 2.0), -0.08, 0)
        restored = (img_clahe.astype(float) * (1 - mask3) + brighten.astype(float) * mask3).astype('uint8')

        # Denoise mildly
        denoised = cv2.fastNlMeansDenoisingColored(restored, None, h=7, hColor=7, templateWindowSize=7, searchWindowSize=21)
        return denoised
    except Exception as e:
        logger.exception('restore_fallback failed: %s', e)
        return img_np


def enhanced_restore(img_np, params=None):
    """Parametrizable restoration pipeline that preserves text while improving contrast.
    
    Parámetros configurables:
    - clahe_clip: 1.0-4.0, controla el límite de contraste adaptativo (mayor = más contraste)
    - kernel_size: 15-61 (impar), tamaño del kernel para detección de sombras (mayor = menos detalle)
    - shadow_threshold: 10-40, umbral para detectar sombras (mayor = menos corrección)
    - brightness_boost: 1.0-1.15, multiplicador de brillo en zonas oscuras
    - denoise_strength: 3-12, fuerza del denoising (mayor = más suavizado, puede perder texto)
    - sharpen_amount: 1.0-1.3, cantidad de sharpening (mayor = más nitidez)
    - contrast_boost: 1.0-1.1, boost final de contraste
    """
    # Valores por defecto MUY conservadores
    if params is None:
        params = {}
    
    clahe_clip = params.get('clahe_clip', 1.8)
    kernel_size = params.get('kernel_size', 31)
    shadow_threshold = params.get('shadow_threshold', 25)
    brightness_boost = params.get('brightness_boost', 1.03)
    denoise_strength = params.get('denoise_strength', 4)
    sharpen_amount = params.get('sharpen_amount', 1.08)
    contrast_boost = params.get('contrast_boost', 1.01)
    
    # Validar rangos
    clahe_clip = max(1.0, min(4.0, clahe_clip))
    kernel_size = max(15, min(61, kernel_size))
    if kernel_size % 2 == 0: kernel_size += 1  # Asegurar impar
    shadow_threshold = max(10, min(40, shadow_threshold))
    brightness_boost = max(1.0, min(1.15, brightness_boost))
    denoise_strength = max(3, min(12, denoise_strength))
    sharpen_amount = max(1.0, min(1.3, sharpen_amount))
    contrast_boost = max(1.0, min(1.1, contrast_boost))
    
    try:
        img = img_np.copy()

        # CLAHE adaptativo
        lab = cv2.cvtColor(img, cv2.COLOR_BGR2LAB)
        l, a, b = cv2.split(lab)
        clahe = cv2.createCLAHE(clipLimit=clahe_clip, tileGridSize=(8,8))
        l2 = clahe.apply(l)
        lab2 = cv2.merge((l2, a, b))
        img_clahe = cv2.cvtColor(lab2, cv2.COLOR_LAB2BGR)

        # Detección y corrección de sombras
        gray = cv2.cvtColor(img_clahe, cv2.COLOR_BGR2GRAY)
        kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (kernel_size, kernel_size))
        bg = cv2.morphologyEx(gray, cv2.MORPH_CLOSE, kernel)
        diff = cv2.subtract(bg, gray)
        norm = cv2.normalize(diff, None, 0, 255, cv2.NORM_MINMAX)
        mask = cv2.threshold(norm, shadow_threshold, 255, cv2.THRESH_BINARY)[1]
        blur_size = kernel_size // 2
        if blur_size % 2 == 0: blur_size += 1
        mask = cv2.GaussianBlur(mask, (blur_size, blur_size), 0)
        mask3 = cv2.cvtColor(mask, cv2.COLOR_GRAY2BGR).astype(float)/255.0

        # Corrección de brillo en sombras
        brighten = cv2.addWeighted(img_clahe, brightness_boost, cv2.GaussianBlur(img_clahe, (0,0), 2.0), -(brightness_boost-1.0), 0)
        restored = (img_clahe.astype(float) * (1 - mask3) + brighten.astype(float) * mask3).astype('uint8')

        # Denoising
        denoised = cv2.fastNlMeansDenoisingColored(restored, None, h=denoise_strength, hColor=denoise_strength, templateWindowSize=7, searchWindowSize=15)

        # Sharpening
        blurred = cv2.GaussianBlur(denoised, (0,0), sigmaX=0.8)
        final = cv2.addWeighted(denoised, sharpen_amount, blurred, -(sharpen_amount-1.0), 0)
        
        # Boost de contraste final
        final = cv2.convertScaleAbs(final, alpha=contrast_boost, beta=0)

        return final
    except Exception as e:
        logger.exception('enhanced_restore failed: %s', e)
        return img_np


# --- DocRes pre/post-processing helpers ---
def _round_up_to_multiple(x, m=32):
    return ((x + m - 1) // m) * m


def prepare_docres_input(img_bgr):
    """Prepare image for DocRes model:
    - Convert BGR uint8 to RGB float32 in [0,1]
    - Resize to nearest multiple of 32 (keeping aspect by scaling) where both dims are multiples of 32
    Returns (prepared_np, orig_shape, prepared_shape, resize_scale)
    """
    try:
        h, w = img_bgr.shape[:2]
        target_h = _round_up_to_multiple(h, 32)
        target_w = _round_up_to_multiple(w, 32)
        # If not equal, resize while preserving aspect ratio to fit into target dims
        if (target_h != h) or (target_w != w):
            # compute scaling factor to fit image in new dims while preserving aspect
            sf = min(target_w / w, target_h / h)
            new_w = max(32, int(round(w * sf)))
            new_h = max(32, int(round(h * sf)))
            # ensure multiples of 32
            new_w = _round_up_to_multiple(new_w, 32)
            new_h = _round_up_to_multiple(new_h, 32)
            prepared = cv2.resize(img_bgr, (new_w, new_h), interpolation=cv2.INTER_AREA)
            resize_scale = (new_w / w, new_h / h)
        else:
            prepared = img_bgr.copy()
            resize_scale = (1.0, 1.0)
        # Convert BGR->RGB, to float32, normalize to [0,1]
        prepared = cv2.cvtColor(prepared, cv2.COLOR_BGR2RGB).astype('float32') / 255.0
        return prepared, (h, w), prepared.shape[:2], resize_scale
    except Exception as e:
        logger.exception('prepare_docres_input failed: %s', e)
        # Fallback: return normalized original
        try:
            return cv2.cvtColor(img_bgr, cv2.COLOR_BGR2RGB).astype('float32') / 255.0, (h, w), (h, w), (1.0,1.0)
        except Exception:
            return img_bgr.astype('float32') / 255.0, (h, w), (h, w), (1.0,1.0)


def postprocess_docres_output(out_np, orig_shape, prepared_shape, resize_scale):
    """Convert DocRes output (assumed RGB float in [0,1] or uint8 0-255) back to BGR uint8 of orig_shape.
    - Clip and scale properly to avoid saturation artifacts
    - Resize back to original image size using INTER_LINEAR
    """
    try:
        arr = out_np
        # If model returned torch tensor, convert to numpy
        if hasattr(arr, 'cpu'):
            arr = arr.detach().cpu().numpy()
        arr = np.asarray(arr)
        # If channels first, convert
        if arr.ndim == 3 and arr.shape[0] <= 4 and arr.shape[0] != prepared_shape[0]:
            # (C,H,W) -> (H,W,C)
            arr = np.transpose(arr, (1,2,0))
        # If values are in float >1, try to detect and scale
        if arr.dtype == np.float32 or arr.dtype == np.float64:
            # Clip tiny eps and ensure range [0,1]
            arr = np.clip(arr, 0.0, 1.0)
            arr = (arr * 255.0).astype('uint8')
        else:
            arr = arr.astype('uint8')
        # Now arr is uint8 RGB or BGR depending on model; assume RGB
        # Resize back to original shape
        prepared_h, prepared_w = prepared_shape
        orig_h, orig_w = orig_shape
        if (arr.shape[0] != prepared_h) or (arr.shape[1] != prepared_w):
            arr = cv2.resize(arr, (prepared_w, prepared_h), interpolation=cv2.INTER_LINEAR)
        # Convert RGB->BGR
        if arr.ndim == 3 and arr.shape[2] == 3:
            arr_bgr = cv2.cvtColor(arr, cv2.COLOR_RGB2BGR)
        else:
            arr_bgr = arr
        if (prepared_h, prepared_w) != (orig_h, orig_w):
            arr_bgr = cv2.resize(arr_bgr, (orig_w, orig_h), interpolation=cv2.INTER_LINEAR)
        # Final clamp to avoid saturation
        arr_bgr = np.clip(arr_bgr, 0, 255).astype('uint8')
        return arr_bgr
    except Exception as e:
        logger.exception('postprocess_docres_output failed: %s', e)
        # Fallback: return resized uint8 of the input shape
        try:
            out_img = (out_np * 255.0).astype('uint8') if out_np.dtype in [np.float32, np.float64] else out_np.astype('uint8')
            out_img = cv2.resize(out_img, (orig_shape[1], orig_shape[0]), interpolation=cv2.INTER_LINEAR)
            return out_img
        except Exception:
            return (np.clip(out_np, 0, 255).astype('uint8'))



def is_destructive(original, candidate, diff_thresh=None, pct_thresh=None):
    """Heuristic detector to decide if candidate has destroyed a large portion of content.
    Compara la diferencia en escala de grises y calcula porcentaje de píxeles con cambio mayor a diff_thresh.
    Retorna (is_destructive:bool, changed_pct:float)
    """
    try:
        if diff_thresh is None:
            diff_thresh = int(os.getenv('DESTRUCTIVE_DIFF_THRESHOLD', '25'))
        if pct_thresh is None:
            pct_thresh = float(os.getenv('DESTRUCTIVE_PCT', '0.05'))
        g1 = cv2.cvtColor(original, cv2.COLOR_BGR2GRAY)
        g2 = cv2.cvtColor(candidate, cv2.COLOR_BGR2GRAY)
        diff = cv2.absdiff(g1, g2)
        changed = np.mean((diff > diff_thresh).astype(float))
        return (changed > pct_thresh), float(changed)
    except Exception as e:
        logger.exception('is_destructive failed: %s', e)
        return False, 0.0


@app.post('/detect')
async def detect_corners(image: UploadFile = File(...)):
    start = time.time()
    if cv2 is None:
        return JSONResponse(status_code=500, content={"ok": False, "error": "Missing Python requirements (opencv, ultralytics, pillow)"})

    try:
        contents = await image.read()
        pil = Image.open(io.BytesIO(contents)).convert('RGB')
        img = np.array(pil)[:, :, ::-1]  # PIL RGB -> BGR
        h, w = img.shape[:2]

        # Preprocess image subtly to improve detection (CLAHE + light sharpen)
        img_proc = preprocess_image(img)

        # Try to load YOLO and use it; if not available or fails, fall back to OpenCV-based contour detection
        use_yolo = True
        try:
            model = get_model()
        except Exception as e:
            logger.warning('YOLO model not available, falling back to OpenCV: %s', e)
            use_yolo = False

        def opencv_detect(img_np):
            # Grayscale, blur, edge detection, contours
            gray = cv2.cvtColor(img_np, cv2.COLOR_BGR2GRAY)
            blurred = cv2.GaussianBlur(gray, (5, 5), 0)
            edges = cv2.Canny(blurred, 50, 150)
            kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (5, 5))
            dilated = cv2.dilate(edges, kernel)
            contours, _ = cv2.findContours(dilated, cv2.RETR_LIST, cv2.CHAIN_APPROX_SIMPLE)

            contour_info = []
            for i, c in enumerate(contours):
                area = cv2.contourArea(c)
                perimeter = cv2.arcLength(c, True)
                approx = cv2.approxPolyDP(c, 0.02 * perimeter, True)
                pts = []
                for p in range(min(approx.shape[0], 20)):
                    pts.append({'x': int(approx[p][0][0]), 'y': int(approx[p][0][1])})
                contour_info.append({'index': i, 'area': area, 'approxRows': approx.shape[0], 'perimeter': perimeter, 'approxPoints': pts})

            contour_info.sort(key=lambda x: x['area'], reverse=True)

            # Try to use a large contour and approx to 4 points
            best = None
            for ci in contour_info[:10]:
                if ci['area'] < (w * h) * 0.01:
                    continue
                # try to reconstruct contour from approxPoints
                approx_pts = np.array([[p['x'], p['y']] for p in ci['approxPoints']], dtype=np.int32)
                if approx_pts.shape[0] == 0:
                    continue
                per = cv2.arcLength(approx_pts.astype(np.float32), True)
                for eps_ratio in [0.02, 0.04, 0.06, 0.08]:
                    approx2 = cv2.approxPolyDP(approx_pts.astype(np.float32), eps_ratio * per, True)
                    if approx2.shape[0] == 4:
                        best = approx2.reshape(4, 2)
                        break
                if best is not None:
                    break

            if best is not None:
                # If detected polygon touches image edges or covers a big fraction, prefer full-image rectangle
                try:
                    best_area = cv2.contourArea(best)
                    if polygon_touches_edge(best, w, h, tol=6) or (best_area >= 0.55 * (w * h)):
                        logger.info('Contour touches edge or covers large area - snapping to full image rectangle')
                        full = [{'x': 0, 'y': 0}, {'x': w, 'y': 0}, {'x': w, 'y': h}, {'x': 0, 'y': h}]
                        dbg = img_np.copy()
                        cv2.polylines(dbg, [np.array([[0,0],[w,0],[w,h],[0,h]], dtype=np.int32)], True, (0, 165, 255), 3)
                        _, png = cv2.imencode('.png', dbg)
                        debug_b64 = base64.b64encode(png.tobytes()).decode()
                        return {'ok': True, 'points': full, 'debug_image_base64': debug_b64}
                except Exception:
                    pass

                ordered = order_corners(best)
                dbg = img_np.copy()
                for i, (x, y) in enumerate(ordered):
                    cv2.circle(dbg, (x, y), 10, (0, 255, 0), -1)
                    cv2.putText(dbg, str(i + 1), (x + 12, y + 6), cv2.FONT_HERSHEY_SIMPLEX, 1, (255, 255, 255), 2)
                cv2.polylines(dbg, [np.array(ordered, dtype=np.int32)], True, (0, 255, 0), 4)
                _, png = cv2.imencode('.png', dbg)
                debug_b64 = base64.b64encode(png.tobytes()).decode()
                return {'ok': True, 'points': [{'x': int(x), 'y': int(y)} for x, y in ordered], 'debug_image_base64': debug_b64}

            # No quad found
            # If the largest contour touches edges and covers a big area, assume document spans full image
            if contour_info and contour_info[0]['area'] >= 0.55 * (w * h):
                try:
                    candidate = contour_info[0]
                    pts_arr = np.array([[p['x'], p['y']] for p in candidate['approxPoints']], dtype=np.int32)
                    if polygon_touches_edge(pts_arr, w, h, tol=6):
                        full = [{'x': 0, 'y': 0}, {'x': w, 'y': 0}, {'x': w, 'y': h}, {'x': 0, 'y': h}]
                        dbg = img_np.copy()
                        cv2.polylines(dbg, [np.array([[0,0],[w,0],[w,h],[0,h]], dtype=np.int32)], True, (0, 165, 255), 3)
                        _, png = cv2.imencode('.png', dbg)
                        debug_b64 = base64.b64encode(png.tobytes()).decode()
                        return {'ok': True, 'points': full, 'debug_image_base64': debug_b64}
                except Exception:
                    pass

            dbg = img_np.copy()
            for i, p in enumerate(fb):
                cv2.circle(dbg, (p['x'], p['y']), 8, (0, 165, 255), -1)
                cv2.putText(dbg, str(i + 1), (p['x'] + 10, p['y'] + 6), cv2.FONT_HERSHEY_SIMPLEX, 1, (255, 255, 255), 2)
            cv2.polylines(dbg, [np.array([[p['x'], p['y']] for p in fb], dtype=np.int32)], True, (0, 165, 255), 3)
            _, png = cv2.imencode('.png', dbg)
            debug_b64 = base64.b64encode(png.tobytes()).decode()
            return {'ok': False, 'points': None, 'fallback': fb, 'debug_image_base64': debug_b64}

        # If YOLO available, try it first
        if use_yolo:
            try:
                results = model(img_proc, device=0, conf=CONFIDENCE, verbose=False)

                # Iterate results and look for masks
                for r in results:
                    masks = getattr(r, 'masks', None)
                    if masks is None:
                        continue
                    # masks.xy is list of polygons per mask
                    polys = getattr(masks, 'xy', None)
                    if not polys:
                        continue
                    # Take largest mask polygon (by area)
                    best_poly = None
                    best_area = 0
                    for poly in polys:
                        pts = np.array(poly)
                        area = cv2.contourArea(pts.astype(np.int32))
                        if area > best_area:
                            best_area = area
                            best_poly = pts

                    if best_poly is None or best_area <= 0:
                        continue

                    per = cv2.arcLength(best_poly.astype(np.float32), True)
                    found = False
                    for eps_ratio in [0.02, 0.04, 0.06, 0.08]:
                        eps = eps_ratio * per
                        approx = cv2.approxPolyDP(best_poly.astype(np.float32), eps, True)
                        if len(approx) == 4:
                            approx_pts = approx.reshape(4, 2)
                            try:
                                area_approx = cv2.contourArea(approx_pts.astype(np.int32))
                                if polygon_touches_edge(approx_pts, w, h, tol=6) or (area_approx >= 0.55 * (w * h)):
                                    # Prefer full-image rectangle when mask touches edges or covers most of image
                                    full = [{"x": 0, "y": 0}, {"x": w, "y": 0}, {"x": w, "y": h}, {"x": 0, "y": h}]
                                    dbg = img.copy()
                                    cv2.polylines(dbg, [np.array([[0,0],[w,0],[w,h],[0,h]], dtype=np.int32)], True, (0, 165, 255), 3)
                                    _, png = cv2.imencode('.png', dbg)
                                    debug_b64 = base64.b64encode(png.tobytes()).decode()
                                    elapsed = int((time.time() - start) * 1000)
                                    return {
                                        "ok": True,
                                        "points": full,
                                        "debug_image_base64": debug_b64,
                                        "model": os.path.basename(MODEL_PATH),
                                        "timing_ms": elapsed,
                                    }
                            except Exception:
                                pass

                            ordered = order_corners(approx.reshape(4, 2))
                            # create debug image
                            dbg = img.copy()
                            for i, (x, y) in enumerate(ordered):
                                cv2.circle(dbg, (x, y), 10, (0, 255, 0), -1)
                                cv2.putText(dbg, str(i + 1), (x + 12, y + 6), cv2.FONT_HERSHEY_SIMPLEX, 1, (255, 255, 255), 2)
                            # draw polygon
                            cv2.polylines(dbg, [np.array(ordered, dtype=np.int32)], True, (0, 255, 0), 4)
                            _, png = cv2.imencode('.png', dbg)
                            debug_b64 = base64.b64encode(png.tobytes()).decode()
                            elapsed = int((time.time() - start) * 1000)
                            return {
                                "ok": True,
                                "points": [{"x": int(x), "y": int(y)} for x, y in ordered],
                                "debug_image_base64": debug_b64,
                                "model": os.path.basename(MODEL_PATH),
                                "timing_ms": elapsed,
                            }
                        
                # If YOLO didn't find, fallback to OpenCV using preprocessed image
                oc_res = opencv_detect(img_proc)
                if oc_res.get('ok'):
                    elapsed = int((time.time() - start) * 1000)
                    return {**oc_res, 'model': 'opencv_fallback', 'timing_ms': elapsed}
                else:
                    elapsed = int((time.time() - start) * 1000)
                    return {**oc_res, 'model': 'opencv_fallback', 'timing_ms': elapsed}

            except Exception as e:
                logger.exception('YOLO inference failed, falling back to OpenCV: %s', e)
                oc_res = opencv_detect(img)
                elapsed = int((time.time() - start) * 1000)
                return {**oc_res, 'model': 'opencv_fallback', 'timing_ms': elapsed}

        # If not using YOLO, use OpenCV fallback on the preprocessed image
        oc_res = opencv_detect(img_proc)
        elapsed = int((time.time() - start) * 1000)
        return {**oc_res, 'model': 'opencv_fallback', 'timing_ms': elapsed}

    except Exception as e:
        logger.exception('Error in detect endpoint')
        return JSONResponse(status_code=500, content={"ok": False, "error": str(e)})


from fastapi import Form  # add Form import


@app.post('/restore')
async def restore_document(
    image: UploadFile = File(...), 
    enhance: Optional[str] = Form(None),
    # Parámetros de mejora configurables
    clahe_clip: Optional[float] = Form(None),
    kernel_size: Optional[int] = Form(None),
    shadow_threshold: Optional[int] = Form(None),
    brightness_boost: Optional[float] = Form(None),
    denoise_strength: Optional[int] = Form(None),
    sharpen_amount: Optional[float] = Form(None),
    contrast_boost: Optional[float] = Form(None)
):
    start = time.time()
    if cv2 is None:
        return JSONResponse(status_code=500, content={"ok": False, "error": "Missing Python requirements (opencv, ultralytics, pillow)"})
    try:
        contents = await image.read()
        pil = Image.open(io.BytesIO(contents)).convert('RGB')
        img = np.array(pil)[:, :, ::-1]  # PIL RGB -> BGR

        want_enhance = False
        if enhance is not None:
            try:
                if isinstance(enhance, str):
                    if enhance.lower() in ('1', 'true', 'yes', 'on'):
                        want_enhance = True
                elif bool(enhance):
                    want_enhance = True
            except Exception:
                want_enhance = False

        # Construir diccionario de parámetros
        params = {}
        if clahe_clip is not None: params['clahe_clip'] = clahe_clip
        if kernel_size is not None: params['kernel_size'] = kernel_size
        if shadow_threshold is not None: params['shadow_threshold'] = shadow_threshold
        if brightness_boost is not None: params['brightness_boost'] = brightness_boost
        if denoise_strength is not None: params['denoise_strength'] = denoise_strength
        if sharpen_amount is not None: params['sharpen_amount'] = sharpen_amount
        if contrast_boost is not None: params['contrast_boost'] = contrast_boost

        logger.info('Restore called with params: %s', params)

        # Try DocRes model first (if installed and model file present)
        doc_model = get_docres_model()
        if doc_model:
            try:
                # Prepare input: normalize and resize to multiple of 32
                try:
                    prepared, orig_shape, prepared_shape, resize_scale = prepare_docres_input(img)
                    logger.info('DocRes input prepared: orig=%s prepared=%s resize_scale=%s', orig_shape, prepared_shape, resize_scale)
                except Exception as e:
                    logger.exception('Failed to prepare DocRes input, falling back to raw: %s', e)
                    prepared = img.astype('float32') / 255.0
                    orig_shape = (img.shape[0], img.shape[1])
                    prepared_shape = orig_shape
                    resize_scale = (1.0, 1.0)

                # Best-effort API compatibility: try common methods
                out = None
                try:
                    if hasattr(doc_model, 'restore'):
                        out = doc_model.restore(prepared)
                    elif callable(doc_model):
                        out = doc_model(prepared)
                    else:
                        raise RuntimeError('DocRes model loaded but has no usable interface')
                except Exception as e:
                    # Some DocRes interfaces expect uint8 image inputs; try fallback
                    logger.info('DocRes direct call failed (%s), trying fallback with uint8 input', e)
                    try:
                        out = doc_model((img).astype('uint8'))
                    except Exception as ee:
                        logger.exception('DocRes call failed on fallback too: %s', ee)
                        raise

                # Normalize output to BGR uint8 at original size
                try:
                    if isinstance(out, tuple):
                        out = out[0]
                    restored = postprocess_docres_output(out, orig_shape, prepared_shape, resize_scale)
                except Exception as e:
                    logger.exception('Failed to postprocess DocRes output: %s', e)
                    # As a last resort try to coerce to uint8 image
                    if hasattr(out, 'cpu'):
                        outc = out.detach().cpu().numpy()
                        outc = np.transpose(outc, (1,2,0)) if outc.shape[0] <= 4 else outc
                        outc = np.clip(outc, 0, 255).astype('uint8')
                        restored = cv2.resize(outc, (orig_shape[1], orig_shape[0]), interpolation=cv2.INTER_LINEAR)
                    else:
                        restored = img

                # If user requested enhancement, run enhanced postprocessing
                if want_enhance:
                    try:
                        candidate = enhanced_restore(restored, params)
                        # Safety check: if enhanced candidate is destructive, fallback
                        destructive, changed_pct = is_destructive(restored, candidate)
                        if destructive:
                            logger.warning('Enhanced post-DocRes result considered destructive (changed_pct=%.4f); falling back to conservative restore', changed_pct)
                            restored = restore_fallback(restored)
                            fallback_applied = True
                            fallback_reason = 'enhanced_result_destructive'
                        else:
                            restored = candidate
                            fallback_applied = False
                            fallback_reason = None
                    except Exception:
                        logger.exception('Post enhancement after DocRes failed')
                        fallback_applied = False
                        fallback_reason = None
                else:
                    fallback_applied = False
                    fallback_reason = None

                elapsed = int((time.time() - start) * 1000)
                _, png = cv2.imencode('.png', restored)
                return {"ok": True, "restored_image_base64": base64.b64encode(png.tobytes()).decode(), "model": 'DocRes' + ("+enhanced" if want_enhance else ""), "timing_ms": elapsed, "params": params, "fallback": fallback_applied, "fallback_reason": fallback_reason} 
            except Exception as e:
                logger.exception('DocRes model failed, falling back: %s', e)
                # fall through to fallback

        # Choose fallback based on requested mode
        if want_enhance:
            candidate = enhanced_restore(img, params)
            destructive, changed_pct = is_destructive(img, candidate)
            if destructive:
                logger.warning('Enhanced result considered destructive (changed_pct=%.4f); falling back to conservative restore', changed_pct)
                restored = restore_fallback(img)
                model_name = 'enhanced_fallback_rejected'
                fallback_applied = True
                fallback_reason = 'enhanced_result_destructive'
            else:
                restored = candidate
                model_name = 'enhanced_fallback'
                fallback_applied = False
                fallback_reason = None
        else:
            restored = restore_fallback(img)
            model_name = 'fallback'
            fallback_applied = False
            fallback_reason = None

        elapsed = int((time.time() - start) * 1000)
        _, png = cv2.imencode('.png', restored)
        return {"ok": True, "restored_image_base64": base64.b64encode(png.tobytes()).decode(), "model": model_name, "timing_ms": elapsed, "params": params, "fallback": fallback_applied, "fallback_reason": fallback_reason}
    except Exception as e:
        logger.exception('Error in restore endpoint')
        return JSONResponse(status_code=500, content={"ok": False, "error": str(e)})


@app.get('/status')
async def status():
    """Return environment and model status for debugging and health checks."""
    info = {
        'ok': True,
        'cv2_installed': cv2 is not None,
        'numpy_installed': np is not None,
        'pil_installed': Image is not None,
        'ultralytics_installed': YOLO is not None,
        'yolo_model_path': MODEL_PATH,
        'yolo_model_exists': os.path.exists(MODEL_PATH),
    }

    # Torch availability check
    try:
        import importlib
        torch_spec = importlib.util.find_spec('torch')
        if torch_spec is not None:
            import torch
            info['torch_installed'] = True
            info['torch_version'] = getattr(torch, '__version__', None)
            try:
                info['torch_cuda_available'] = torch.cuda.is_available()
                info['cuda_device_count'] = torch.cuda.device_count()
            except Exception:
                info['torch_cuda_available'] = False
                info['cuda_device_count'] = 0
        else:
            info['torch_installed'] = False
            info['torch_version'] = None
            info['torch_cuda_available'] = False
            info['cuda_device_count'] = 0
    except Exception as e:
        info['torch_error'] = str(e)

    # DocRes status (attempt to load lazily)
    info['docres_installed'] = DocRes is not None
    info['docres_model_path'] = DOCRES_PATH
    info['docres_model_exists'] = os.path.exists(DOCRES_PATH)
    try:
        doc = get_docres_model()
        info['docres_loaded'] = doc is not None
    except Exception as e:
        info['docres_loaded'] = False
        info['docres_load_error'] = str(e)

    # YOLO model load quick test (don't force heavy init if missing)
    try:
        if info['ultralytics_installed'] and os.path.exists(MODEL_PATH):
            _ = get_model()
            info['yolo_loaded'] = _ is not None
        else:
            info['yolo_loaded'] = False
    except Exception as e:
        info['yolo_loaded'] = False
        info['yolo_load_error'] = str(e)

    return JSONResponse(content=info)
