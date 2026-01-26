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


@app.post('/restore')
async def restore_document(image: UploadFile = File(...)):
    start = time.time()
    if cv2 is None:
        return JSONResponse(status_code=500, content={"ok": False, "error": "Missing Python requirements (opencv, ultralytics, pillow)"})
    try:
        contents = await image.read()
        pil = Image.open(io.BytesIO(contents)).convert('RGB')
        img = np.array(pil)[:, :, ::-1]  # PIL RGB -> BGR

        # Try DocRes model first (if installed and model file present)
        doc_model = get_docres_model()
        if doc_model:
            try:
                # Best-effort API compatibility: try common methods
                if hasattr(doc_model, 'restore'):
                    out = doc_model.restore(img)
                elif callable(doc_model):
                    out = doc_model(img)
                else:
                    raise RuntimeError('DocRes model loaded but has no usable interface')
                # Ensure result is numpy array BGR
                if isinstance(out, tuple):
                    out = out[0]
                restored = out.astype('uint8')
                elapsed = int((time.time() - start) * 1000)
                _, png = cv2.imencode('.png', restored)
                return {"ok": True, "restored_image_base64": base64.b64encode(png.tobytes()).decode(), "model": 'DocRes', "timing_ms": elapsed}
            except Exception as e:
                logger.exception('DocRes model failed, falling back: %s', e)
                # fall through to fallback

        # Fallback restoration
        restored = restore_fallback(img)
        elapsed = int((time.time() - start) * 1000)
        _, png = cv2.imencode('.png', restored)
        return {"ok": True, "restored_image_base64": base64.b64encode(png.tobytes()).decode(), "model": 'fallback', "timing_ms": elapsed}
    except Exception as e:
        logger.exception('Error in restore endpoint')
        return JSONResponse(status_code=500, content={"ok": False, "error": str(e)})
