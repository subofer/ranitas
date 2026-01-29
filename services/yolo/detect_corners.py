#!/usr/bin/env python3
"""Production-ready FastAPI Vision Service - RTX 3090 Optimized

Unified stack: YOLOv26 + Ollama (qwen2.5-vl:7b) + FastAPI
All models stay in VRAM (keep_alive: -1)

Zero waste: No transformers, no bitsandbytes, no local LLM loading.
Pure Ollama orchestration for invoice parsing.
"""

import os
import sys
import time
import json
import base64
import logging
import asyncio
import re
from io import BytesIO
from typing import Optional, Any

import numpy as np
import cv2
import requests
from PIL import Image
from fastapi import FastAPI, File, UploadFile, HTTPException, Form
import uuid
from fastapi.responses import JSONResponse, StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from ultralytics import YOLO
import subprocess

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(name)s: %(message)s'
)
logger = logging.getLogger("vision")

from datetime import datetime

def ts():
    return datetime.now().strftime('%Y-%m-%d %H:%M:%S,%f')[:-3]

def tprint(msg, emoji=''):
    # Print unified, timestamped, emoji-annotated line for docker logs
    print(f"{ts()} {emoji} {msg}")
    logger.info(msg)

# === CONFIG ===
# Prefer YOLOv26 Open-Vocabulary segmentation model by default
MODEL_PATH = os.environ.get('YOLO_MODEL_PATH', '/app/models/yolov26l-seg.pt')
# Target classes prioritized for document detection (used when model supports text prompts)
TARGET_CLASSES = ["white paper document", "printed receipt", "tax invoice"]
CONFIDENCE = float(os.environ.get('YOLO_CONF', 0.25))
MASK_THRESHOLD = float(os.environ.get('MASK_THRESHOLD', 0.5))
OLLAMA_HOST = os.environ.get('OLLAMA_HOST', 'http://127.0.0.1:11434')
OLLAMA_MODEL = os.environ.get('OLLAMA_MODEL', 'qwen2.5vl:7b')
OLLAMA_TIMEOUT = int(os.environ.get('OLLAMA_TIMEOUT', 600))
# Enhancement tunables (can be tuned via env)
ENH_CLAHE_CLIP = float(os.environ.get('ENH_CLAHE_CLIP', 6.0))
ENH_DENOISE_H = float(os.environ.get('ENH_DENOISE_H', 20.0))
ENH_SHARPEN_CENTER = int(os.environ.get('ENH_SHARPEN_CENTER', 12))
# Confidence threshold above which YOLO crop is considered reliable (0..1)
YOLO_CROP_CONF = float(os.environ.get('YOLO_CROP_CONF', 0.8))
# When we skip cropping, pad the full image by this fraction (5% default)
NO_CROP_PADDING = float(os.environ.get('NO_CROP_PADDING', 0.05))

# Verbose diagnostics (set VISION_VERBOSE=1 in docker env to enable)
VISION_VERBOSE = os.environ.get('VISION_VERBOSE', '0') in ('1', 'true', 'True', 'TRUE')

# === GLOBALS ===
_yolo_model = None

app = FastAPI(title="Vision AI Service")

app.add_middleware(
    CORSMiddleware,
    allow_origins=os.environ.get('VISION_ALLOW_ORIGINS', '*').split(','),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# === Startup preloads ===
@app.on_event('startup')
async def _vision_startup_preload():
    """Preload heavy models so /status and /models show them as loaded.
    - Load YOLO eagerly so the UI sees 'loaded'=True
    - Probe Ollama availability and qwen model presence
    """
    tprint('🚀 Starting unified Vision AI stack (RTX 3090 optimized)')

    # GPU probe
    try:
        import torch
        if torch.cuda.is_available():
            try:
                name = torch.cuda.get_device_name(0)
                mem = torch.cuda.get_device_properties(0).total_memory / 1024**3
                tprint(f"✅ GPU: {name} ({mem:.1f}GB)")
            except Exception:
                tprint('✅ GPU detected (details unavailable)')
        else:
            tprint('⚠️ GPU not available')
    except Exception:
        tprint('⚠️ Could not probe GPU')

    # Pre-warm YOLO
    tprint('⏱ Pre-warming YOLO model (fast)')
    try:
        loop = asyncio.get_event_loop()
        await loop.run_in_executor(None, get_yolo_model)
        tprint('Startup: YOLO preload complete')
    except Exception:
        logger.exception('Startup: YOLO preload failed')

    # Probe Ollama and check configured model presence
    tprint('🧠 Probing Ollama API...')
    try:
        resp = requests.get(f"{OLLAMA_HOST}/api/tags", timeout=3)
        if resp.status_code == 200:
            tprint('✅ Ollama API ready')
            try:
                models = [m.get('name') for m in resp.json().get('models', [])]
                tprint(f'⬇️ Checking for {OLLAMA_MODEL} locally... (OLLAMA_AUTO_PULL={os.environ.get("OLLAMA_AUTO_PULL", "0")})')
                if OLLAMA_MODEL in models:
                    tprint(f'ℹ️ Model {OLLAMA_MODEL} present locally')
                    tprint(f'🔥 Warming {OLLAMA_MODEL} with keep_alive=-1 (permanent VRAM lock)...')
                    # Optionally a warming call could be done here
                    tprint(f'✅ {OLLAMA_MODEL} locked in VRAM (or warm attempted)')
                else:
                    if os.environ.get('OLLAMA_AUTO_PULL', '0') in ('0', 'false', 'False'):
                        tprint(f'⚠️ OLLAMA_AUTO_PULL=0 -> skipping automatic pull of {OLLAMA_MODEL}')
                    else:
                        tprint(f'⚠️ Model {OLLAMA_MODEL} not present locally')
            except Exception:
                tprint('⚠️ Could not parse Ollama models list')
        else:
            tprint(f'⚠️ Ollama probe returned status {resp.status_code}')
    except Exception:
        tprint(f'⚠️ Ollama not reachable at {OLLAMA_HOST}')

    tprint('🎯 Starting FastAPI...')


def get_yolo_model():
    """Lazy load YOLO and pin to GPU"""
    global _yolo_model
    if _yolo_model is None:
        logger.info(f"Loading YOLO from {MODEL_PATH}")
        _yolo_model = YOLO(MODEL_PATH)
        # Warm-up
        try:
            dummy = np.zeros((640, 640, 3), dtype=np.uint8)
            t0 = time.time()
            _yolo_model.predict(dummy, verbose=False)
            t1 = time.time()
            took_ms = int((t1 - t0) * 1000)
            tprint(f"YOLO pre-warm: loaded= True took_ms= {took_ms}")
        except Exception as e:
            logger.warning(f"YOLO warmup failed: {e}")

        # If this model supports text-prompted classes (YOLOE/v26), set the prioritized document classes
        try:
            if TARGET_CLASSES and hasattr(_yolo_model, 'get_text_pe') and hasattr(_yolo_model, 'set_classes'):
                try:
                    _yolo_model.set_classes(TARGET_CLASSES, _yolo_model.get_text_pe(TARGET_CLASSES))
                    logger.info(f"YOLO classes set to: {TARGET_CLASSES}")
                except Exception as e:
                    logger.warning(f"Could not set YOLO classes: {e}")
        except Exception:
            pass
    return _yolo_model


# DocRes support removed from runtime. Restoration falls back to OpenCV-based heuristics when needed.


def _make_ollama_image_data(img_np, max_w=1280, quality=80):
    """Downscale and encode image as data URL for Ollama (JPEG)."""
    h0, w0 = img_np.shape[:2]
    if w0 > max_w:
        scale = max_w / float(w0)
        img_np = cv2.resize(img_np, (int(w0 * scale), int(h0 * scale)), interpolation=cv2.INTER_AREA)
    # encode as JPEG
    _, buffer = cv2.imencode('.jpg', img_np, [cv2.IMWRITE_JPEG_QUALITY, quality])
    b64 = base64.b64encode(buffer).decode()
    return f"data:image/jpeg;base64,{b64}", len(b64)


def call_ollama_generate(prompt: str, image_base64: Optional[str] = None, keep_alive: int = -1) -> dict:
    """Call Ollama /api/generate with keep_alive=-1 for VRAM persistence

    Args:
        prompt: Text prompt for model
        image_base64: Optional base64 encoded image or data URL (string)
        keep_alive: -1 = never unload, 0 = unload immediately, >0 = seconds

    Returns:
        Dict with 'response' and metadata
    """
    url = f"{OLLAMA_HOST}/api/generate"
    payload = {
        "model": OLLAMA_MODEL,
        "prompt": prompt,
        "stream": False,
        "keep_alive": keep_alive,
        "options": {
            "temperature": 0.1,
            "top_p": 0.9,
            "num_predict": 2048
        }
    }

    if image_base64:
        # Ensure it's a base64 string. Ollama expects the raw base64 (no data: prefix)
        if not isinstance(image_base64, str):
            image_base64 = str(image_base64)
        if image_base64.startswith('data:'):
            try:
                header, raw = image_base64.split(',', 1)
                image_payload = raw
            except Exception:
                image_payload = image_base64
        else:
            image_payload = image_base64
        payload["images"] = [image_payload]

    try:
        resp = requests.post(url, json=payload, timeout=OLLAMA_TIMEOUT)
        try:
            resp.raise_for_status()
        except Exception as e:
            # Save debug info for failed calls
            try:
                ts = int(time.time())
                dbg = {
                    'url': url,
                    'status': resp.status_code,
                    'text': resp.text[:1000]
                }
                os.makedirs('/tmp/vision_ollama_debug', exist_ok=True)
                open(f'/tmp/vision_ollama_debug/resp_{ts}.json', 'w').write(json.dumps(dbg))
            except Exception:
                pass
            raise

        j = resp.json()
        # Log and detect empty responses
        rtext = j.get('response') or ''
        if not rtext.strip():
            try:
                ts = int(time.time())
                os.makedirs('/tmp/vision_ollama_debug', exist_ok=True)
                open(f'/tmp/vision_ollama_debug/empty_resp_{ts}.json', 'w').write(resp.text[:10000])
                # if image present, save a copy for inspection
                if payload.get('images'):
                    b64 = payload['images'][0]
                    if b64.startswith('data:'):
                        _, rest = b64.split(',', 1)
                        open(f'/tmp/vision_ollama_debug/sent_image_{ts}.jpg', 'wb').write(base64.b64decode(rest))
            except Exception:
                pass
            logger.warning('Ollama returned empty response body')
        return j
    except requests.exceptions.RequestException as e:
        logger.error(f"Ollama request failed: {e}")
        raise HTTPException(status_code=503, detail=f"Ollama error: {e}")


def extract_json_from_text(text: str) -> Optional[dict]:
    """Extract and parse first valid JSON object from text"""
    # Try direct parse first
    try:
        return json.loads(text.strip())
    except:
        pass
    
    # Find JSON block in markdown
    match = re.search(r'```(?:json)?\s*(\{.*?\})\s*```', text, re.DOTALL)
    if match:
        try:
            return json.loads(match.group(1))
        except:
            pass
    
    # Find balanced braces
    start = text.find('{')
    if start == -1:
        return None
    
    depth = 0
    for i in range(start, len(text)):
        if text[i] == '{':
            depth += 1
        elif text[i] == '}':
            depth -= 1
            if depth == 0:
                try:
                    return json.loads(text[start:i+1])
                except:
                    pass
    return None


def order_corners(pts):
    """Order 4 points as [TL, TR, BR, BL]"""
    pts = np.array(pts).reshape(-1, 2)
    s = pts.sum(axis=1)
    diff = np.diff(pts, axis=1).reshape(-1)
    return [
        tuple(map(int, pts[np.argmin(s)])),      # TL
        tuple(map(int, pts[np.argmin(diff)])),   # TR
        tuple(map(int, pts[np.argmax(s)])),      # BR
        tuple(map(int, pts[np.argmax(diff)])),   # BL
    ]


def four_point_warp(img, pts):
    """Perspective transform to rectangle"""
    src = np.array(pts, dtype='float32')
    tl, tr, br, bl = src
    
    widthA = np.linalg.norm(br - bl)
    widthB = np.linalg.norm(tr - tl)
    maxWidth = max(int(widthA), int(widthB))
    
    heightA = np.linalg.norm(tr - br)
    heightB = np.linalg.norm(tl - bl)
    maxHeight = max(int(heightA), int(heightB))
    
    dst = np.array([
        [0, 0],
        [maxWidth - 1, 0],
        [maxWidth - 1, maxHeight - 1],
        [0, maxHeight - 1]
    ], dtype='float32')
    
    M = cv2.getPerspectiveTransform(src, dst)
    return cv2.warpPerspective(img, M, (maxWidth, maxHeight))


def detect_document_corners_opencv(img_np):
    """Fallback quad detection using OpenCV (contours + approxPolyDP).
    Uses luminance computed from color channels to avoid direct grayscale conversion."""
    # Compute luminance (approximate gray) from color channels (BGR order) to avoid cvtColor
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
        return order_corners(best)
    return None


def detect_document_corners_aggressive(img_np):
    """Aggressive fallback: try multiple Canny thresholds + morphology to extract large rectangular contours.
    Uses luminance from color channels to avoid cvtColor."""
    # Compute luminance instead of direct grayscale conversion
    gray = (0.299 * img_np[:, :, 2] + 0.587 * img_np[:, :, 1] + 0.114 * img_np[:, :, 0]).astype('uint8')
    clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8,8))
    gray = clahe.apply(gray)
    h, w = img_np.shape[:2]
    best = None
    best_area = 0
    attempts = [(25,100),(50,150),(75,200),(20,120)]
    for (a,b) in attempts:
        edged = cv2.Canny(gray, a, b)
        # close gaps
        kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (5,5))
        closed = cv2.morphologyEx(edged, cv2.MORPH_CLOSE, kernel)
        contours, _ = cv2.findContours(closed, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        for cnt in contours:
            area = cv2.contourArea(cnt)
            if area < (w * h * 0.005) or area > (w * h * 0.99):
                continue
            epsilon = 0.02 * cv2.arcLength(cnt, True)
            approx = cv2.approxPolyDP(cnt, epsilon, True)
            if len(approx) == 4 and area > best_area:
                best = approx.reshape(-1, 2)
                best_area = area
    if best is not None:
        logger.info(f"Aggressive fallback found quad area_ratio={best_area/(w*h):.3f}")
        return order_corners(best)

    # Hough lines fallback
    try:
        edges = cv2.Canny(gray, 50, 200)
        lines = cv2.HoughLinesP(edges, rho=1, theta=np.pi/180, threshold=80, minLineLength=min(w,h)/5, maxLineGap=20)
        if lines is not None:
            hor = []
            ver = []
            for x1,y1,x2,y2 in lines.reshape(-1,4):
                dx = x2 - x1
                dy = y2 - y1
                if abs(dy) < abs(dx) * 0.3:
                    hor.append((x1,y1,x2,y2))
                elif abs(dx) < abs(dy) * 0.3:
                    ver.append((x1,y1,x2,y2))
            if hor and ver:
                # pick top-most and bottom-most horizontals, left-most and right-most verticals
                hor_sorted = sorted(hor, key=lambda l: (l[1]+l[3])/2)
                ver_sorted = sorted(ver, key=lambda l: (l[0]+l[2])/2)
                top = hor_sorted[0]
                bottom = hor_sorted[-1]
                left = ver_sorted[0]
                right = ver_sorted[-1]
                def intersect(l1, l2):
                    x1,y1,x2,y2 = l1
                    x3,y3,x4,y4 = l2
                    denom = (x1-x2)*(y3-y4)-(y1-y2)*(x3-x4)
                    if abs(denom) < 1e-6:
                        return None
                    px = ((x1*y2-y1*x2)*(x3-x4)-(x1-x2)*(x3*y4-y3*x4))/denom
                    py = ((x1*y2-y1*x2)*(y3-y4)-(y1-y2)*(x3*y4-y3*x4))/denom
                    return (int(px), int(py))
                p1 = intersect(top, left)
                p2 = intersect(top, right)
                p3 = intersect(bottom, right)
                p4 = intersect(bottom, left)
                pts = [p for p in [p1,p2,p3,p4] if p is not None]
                if len(pts) == 4:
                    area = cv2.contourArea(np.array(pts, dtype='float32'))
                    if (w*h*0.01) < area < (w*h*0.99):
                        logger.info('Hough fallback succeeded')
                        return order_corners(np.array(pts))
    except Exception:
        logger.exception('Hough fallback error')

    # Text-block fallback
    try:
        tb = detect_document_corners_textblock(img_np)
        if tb is not None:
            logger.info('Using text-block fallback for corners')
            return tb
    except Exception:
        logger.exception('Text-block fallback error')

    # Content bbox fallback: find bounding box of non-white pixels (useful for plain invoices)
    try:
        gray = cv2.cvtColor(img_np, cv2.COLOR_BGR2GRAY)
        _, th = cv2.threshold(gray, 240, 255, cv2.THRESH_BINARY)
        coords = cv2.findNonZero(255 - th)  # invert to get content
        if coords is not None and len(coords) > 0:
            x,y,wc,hc = cv2.boundingRect(coords)
            pad_w = int(wc * 0.04)
            pad_h = int(hc * 0.04)
            x1 = max(0, x - pad_w)
            y1 = max(0, y - pad_h)
            x2 = min(img_np.shape[1]-1, x + wc + pad_w)
            y2 = min(img_np.shape[0]-1, y + hc + pad_h)
            pts = [(x1,y1),(x2,y1),(x2,y2),(x1,y2)]
            logger.info('Using content-bbox fallback')
            return order_corners(pts)
    except Exception:
        logger.exception('Content bbox fallback error')

    return None


def detect_document_corners(img_np, crop_conf=None):
    """Simplified YOLO-only detector.

    Returns a tuple (ordered_corners_or_None, method_string).
    method_string: 'yolo' | 'content_bbox' | 'full_padded' | 'none' | 'error'

    The optional crop_conf parameter overrides global YOLO_CROP_CONF for this call.
    """
    model = get_yolo_model()
    h, w = img_np.shape[:2]
    try:
        conf_threshold = YOLO_CROP_CONF if crop_conf is None else float(crop_conf)
        logger.info(f'detect_document_corners: using crop_conf threshold={conf_threshold:.3f} (YOLO_CROP_CONF default={YOLO_CROP_CONF:.3f}), predict_conf={CONFIDENCE:.3f}')
        # Use a fixed predict_conf (CONFIDENCE) and apply the per-request threshold when selecting a box.
        # This mirrors the prior working behavior where YOLO returned boxes above a baseline (CONFIDENCE)
        # and we accepted them only if their per-box confidence >= conf_threshold.
        results = model.predict(img_np, conf=CONFIDENCE, verbose=False)
        best_box = None
        best_conf = 0.0
        all_confs = []
        
        # Priority 1: TRY SEGMENTATION MASKS (much more precise for slanted docs)
        for r in results:
            if hasattr(r, 'masks') and r.masks is not None:
                for i, mask in enumerate(r.masks.data):
                    cf = float(r.boxes.conf[i])
                    all_confs.append(cf)
                    if cf >= conf_threshold and cf > best_conf:
                        # Extract contour from mask
                        m = mask.cpu().numpy()
                        m = (m * 255).astype('uint8')
                        m = cv2.resize(m, (w, h))
                        contours, _ = cv2.findContours(m, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
                        if contours:
                            c = max(contours, key=cv2.contourArea)
                            # Approximate to 4 points (prefer low-interpretation options)
                            peri = cv2.arcLength(c, True)
                            approx = cv2.approxPolyDP(c, 0.02 * peri, True)
                            if len(approx) == 4:
                                best_conf = cf
                                best_box = [tuple(p[0]) for p in approx]
                                logger.info(f"YOLO segmentation mask + approxPolyDP succeeded with conf={cf:.3f}")
                            else:
                                # Try progressively larger epsilons to reduce vertices toward 4
                                for eps in [0.03, 0.05, 0.08, 0.12]:
                                    approx2 = cv2.approxPolyDP(c, eps * peri, True)
                                    if len(approx2) == 4:
                                        best_conf = cf
                                        best_box = [tuple(p[0]) for p in approx2]
                                        logger.info(f"YOLO mask approxPolyDP reduced to 4 points with eps={eps:.3f}, conf={cf:.3f}")
                                        break
                                if best_box is None:
                                    # Conservative fallback: use minAreaRect -> 4-point polygon (less interpretation)
                                    rect = cv2.minAreaRect(c)
                                    box = cv2.boxPoints(rect)
                                    box = [tuple(map(int, bp)) for bp in box]
                                    best_conf = cf
                                    best_box = box
                                    logger.info(f"YOLO mask fallback to minAreaRect (4 points) with conf={cf:.3f}")

        # Priority 2: FALLBACK TO BOUNDING BOXES (if no masks or approx failed)
        if best_box is None:
            for r in results:
                boxes = getattr(r, 'boxes', None)
                if boxes is None:
                    continue
                try:
                    confs = getattr(boxes, 'conf', None)
                    xys = getattr(boxes, 'xyxy', None)
                    if confs is not None and xys is not None:
                        confs_iter = list(confs.cpu().numpy()) if hasattr(confs, 'cpu') else list(confs)
                        xys_iter = list(xys.cpu().numpy()) if hasattr(xys, 'cpu') else list(xys)
                        for xy, cf in zip(xys_iter, confs_iter):
                            cf = float(cf)
                            # If we hadn't already found a better conf via masks (which would've skipped this)
                            if cf >= conf_threshold and cf > best_conf:
                                best_conf = cf
                                x1, y1, x2, y2 = [int(float(v)) for v in xy]
                                best_box = [(x1, y1), (x2, y1), (x2, y2), (x1, y2)]
                except Exception:
                    continue
        if best_box is not None:
            logger.info(f'YOLO crop accepted with conf={best_conf:.3f}; confidences_sample={sorted(all_confs, reverse=True)[:5]}')
            return order_corners(best_box), 'yolo'
        logger.info(f'YOLO did not reach crop confidence threshold {conf_threshold:.3f}; confidences_sample={sorted(all_confs, reverse=True)[:5]}; trying content-bbox fallback')
        try:
            tb = content_bbox_color(img_np)
            if tb is not None:
                logger.info('Content bbox fallback succeeded')
                return tb, 'content_bbox'
        except Exception:
            logger.exception('Content bbox fallback error')
        logger.info('Content bbox failed; skipping crop')
        return None, 'none'
    except Exception as e:
        logger.exception('YOLO detection failed')
        return None, 'error'


def fallback_corners(w, h, margin=0.03):
    """Return corners with margin from edges (default small margin for tighter crop)"""
    m = int(min(w, h) * margin)
    return [
        (m, m),
        (w - m, m),
        (w - m, h - m),
        (m, h - m)
    ]


def padded_full_image_corners(w, h, pad=NO_CROP_PADDING):
    """Return corners representing the full image with a small padding inset."""
    pad_w = int(w * pad)
    pad_h = int(h * pad)
    x1 = max(0, pad_w)
    y1 = max(0, pad_h)
    x2 = min(w - 1, w - pad_w)
    y2 = min(h - 1, h - pad_h)
    return [(x1, y1), (x2, y1), (x2, y2), (x1, y2)]


def content_bbox_color(img_np, min_area_ratio=0.005, pad_frac=0.03):
    """Compute a tight bounding box of 'content' (non-white) using color channels.
    This avoids converting the image to grayscale and is robust to colored ink/backgrounds.
    Returns ordered corners or None if nothing found or too small.
    """
    h, w = img_np.shape[:2]
    # Mask any pixel that is not nearly white on any channel
    mask = ((img_np[:, :, 0] < 240) | (img_np[:, :, 1] < 240) | (img_np[:, :, 2] < 240)).astype('uint8') * 255
    # Close small gaps to make content contiguous
    try:
        kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (5, 5))
        mask = cv2.morphologyEx(mask, cv2.MORPH_CLOSE, kernel)
    except Exception:
        pass
    coords = cv2.findNonZero(mask)
    if coords is None or len(coords) == 0:
        return None
    x, y, wc, hc = cv2.boundingRect(coords)
    area = float(wc * hc)
    if area / float(w * h) < float(min_area_ratio):
        return None
    pad_w = int(wc * pad_frac)
    pad_h = int(hc * pad_frac)
    x1 = max(0, x - pad_w)
    y1 = max(0, y - pad_h)
    x2 = min(w - 1, x + wc + pad_w)
    y2 = min(h - 1, y + hc + pad_h)
    return order_corners([(x1, y1), (x2, y1), (x2, y2), (x1, y2)])


# === Field detection (invoice regions) ===
FIELD_PROMPTS = [p.strip() for p in os.environ.get('FIELD_PROMPTS', 'emisor,numero,fecha,total,items,importe').split(',') if p.strip()]
FIELD_DET_CONF = float(os.environ.get('FIELD_DET_CONF', 0.25))

def detect_invoice_fields(img_np, prompts=None, conf_thresh=None):
    """Try to detect invoice fields (issuer, date, total, items, etc.) using YOLOE-style text prompts.
    This is best-effort: if the loaded model supports text-prompted classes (YOLOE API), it will be used; otherwise returns []"""
    prompts = prompts or FIELD_PROMPTS
    conf_thresh = conf_thresh if conf_thresh is not None else FIELD_DET_CONF
    model = get_yolo_model()
    if model is None:
        return []
    names = [p.strip() for p in prompts if p.strip()]
    try:
        # If model exposes helper methods for text prompts, try to set classes
        if hasattr(model, 'get_text_pe') and hasattr(model, 'set_classes'):
            try:
                model.set_classes(names, model.get_text_pe(names))
            except Exception:
                # Not fatal; continue
                pass
        # Try to pass a textual prompt directly (best-effort; API may accept 'prompt' arg)
        prompt_text = ', '.join(names)
        results = None
        try:
            results = model.predict(img_np, conf=CONFIDENCE, verbose=False, prompt=prompt_text)
        except TypeError:
            # Older ultralytics may not accept 'prompt' arg; fall back
            results = model.predict(img_np, conf=CONFIDENCE, verbose=False)
        except Exception:
            results = model.predict(img_np, conf=CONFIDENCE, verbose=False)

        found = []
        for r in results:
            boxes = getattr(r, 'boxes', None)
            if boxes is None:
                continue
            confs = getattr(boxes, 'conf', None)
            xys = getattr(boxes, 'xyxy', None)
            cls = getattr(boxes, 'cls', None)
            # iterate
            confs_iter = list(confs.cpu().numpy()) if hasattr(confs, 'cpu') else list(confs)
            xys_iter = list(xys.cpu().numpy()) if hasattr(xys, 'cpu') else list(xys)
            cls_iter = list(cls.cpu().numpy()) if (cls is not None and hasattr(cls, 'cpu')) else (list(cls) if cls is not None else [None]*len(confs_iter))
            for i, (xy, cf) in enumerate(zip(xys_iter, confs_iter)):
                cf = float(cf)
                if cf < conf_thresh:
                    continue
                x1, y1, x2, y2 = [int(float(v)) for v in xy]
                # Determine name: if class idx exists map to names, else use best-effort mapping
                name = None
                try:
                    if cls_iter and cls_iter[i] is not None:
                        idx = int(cls_iter[i])
                        if 0 <= idx < len(names):
                            name = names[idx]
                except Exception:
                    name = None
                if name is None:
                    # fallback: try label from r.names or default to 'field'
                    try:
                        name = r.names[int(getattr(boxes, 'cls', [0])[i])] if hasattr(r, 'names') else 'field'
                    except Exception:
                        name = 'field'
                found.append({'name': str(name), 'bbox': [x1, y1, x2, y2], 'conf': round(cf, 3)})
        return found
    except Exception as e:
        logger.exception('Field detection failed: %s', e)
        return []


def img_to_base64(img_np, quality=92):
    """Convert numpy image to base64 JPEG"""
    if img_np.ndim == 2:
        img_np = cv2.cvtColor(img_np, cv2.COLOR_GRAY2BGR)
    
    _, buffer = cv2.imencode('.jpg', img_np, [cv2.IMWRITE_JPEG_QUALITY, quality])
    return base64.b64encode(buffer).decode()


@app.post("/detect")
async def detect_endpoint(image: UploadFile = File(...), yolo_conf: float = Form(None)):
    """Detect document corners in image. Accepts optional `yolo_conf` to override YOLO crop confidence for this call."""
    try:
        contents = await image.read()
        req_id = str(uuid.uuid4())
        payload_bytes = len(contents)
        nparr = np.frombuffer(contents, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        
        if img is None:
            logger.warning(f"[{req_id}] detect received invalid image (payload_bytes={payload_bytes})")
            raise HTTPException(400, "Invalid image")
        
        # Limit image size to avoid OOM / segfaults in native libs
        h, w = img.shape[:2]
        MAX_DIM = 1600
        if max(w, h) > MAX_DIM:
            scale = MAX_DIM / float(max(w, h))
            new_w, new_h = int(w * scale), int(h * scale)
            img = cv2.resize(img, (new_w, new_h), interpolation=cv2.INTER_AREA)
            logger.info(f"Resized input image from {w}x{h} to {new_w}x{new_h} to limit memory usage")
            h, w = img.shape[:2]

        if VISION_VERBOSE:
            logger.info(f"[{req_id}] detect called: yolo_conf={yolo_conf}, payload_bytes={payload_bytes}, size={w}x{h}")
        try:
            corners, method = detect_document_corners(img, crop_conf=yolo_conf)
        except Exception as e:
            logger.exception('Corner detection raised unexpectedly')
            corners, method = None, 'error'
        
        if corners is None:
            corners = fallback_corners(w, h)
            method = method or 'full_padded'

        # Debug: save the image that was passed to YOLO so we can inspect what the model saw
        try:
            ts = int(time.time())
            os.makedirs('/tmp/vision_detect_input', exist_ok=True)
            cv2.imwrite(f'/tmp/vision_detect_input/input_{ts}.jpg', img)
        except Exception:
            pass

        # Debug image
        debug_img = img.copy()
        cv2.polylines(debug_img, [np.array(corners)], True, (0, 255, 0), 3)
        for pt in corners:
            cv2.circle(debug_img, pt, 8, (255, 0, 0), -1)

        # Also compute fields inside the detected crop (best-effort using YOLOE prompts)
        try:
            warped = four_point_warp(img, corners)
            fields = detect_invoice_fields(warped)
        except Exception:
            fields = []
        
        used_conf = float(yolo_conf) if yolo_conf is not None else float(YOLO_CROP_CONF)

        # append JSONL entry for this detect request
        try:
            log_entry = {
                'req_id': req_id,
                'ts': int(time.time()),
                'payload_bytes': payload_bytes,
                'yolo_conf': used_conf,
                'method': method,
                'points_px': [{"x": int(x), "y": int(y)} for x, y in corners],
                'image_size': {'width': w, 'height': h}
            }
            with open('/tmp/vision_requests.log', 'a') as f:
                f.write(json.dumps(log_entry) + '\n')
            if VISION_VERBOSE:
                logger.info(f"[detect] req={req_id} method={method} points={log_entry['points_px']}")
        except Exception:
            logger.exception('Failed writing vision_requests.log')

        resp_payload = {
            "ok": True,
            "points": [{"x": int(x), "y": int(y)} for x, y in corners],
            "method": method,
            "fields": fields,
            "debug_image_base64": img_to_base64(debug_img),
            "image_size": {"width": w, "height": h},
            "used_yolo_conf": used_conf
        }
        if VISION_VERBOSE:
            resp_payload['vision_log_id'] = req_id

        return JSONResponse(resp_payload)
        
    except Exception as e:
        logger.exception(f"Detection error: {e}")
        raise HTTPException(500, str(e))


@app.post("/process-document")
async def process_document(image: UploadFile = File(...), normalize: bool = Form(True)):
    """Run YOLO segmentation and return a polygon describing the largest detected document.
    Returns normalized coordinates (0..1) by default (normalize=True).
    """
    try:
        contents = await image.read()
        req_id = str(uuid.uuid4())
        req_ts = int(time.time())
        payload_bytes = len(contents)
        nparr = np.frombuffer(contents, np.uint8)
        orig_img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        if orig_img is None:
            logger.warning(f"[{req_id}] process_document received invalid image (payload_bytes={payload_bytes})")
            raise HTTPException(400, "Invalid image")
        orig_h, orig_w = orig_img.shape[:2]
        if VISION_VERBOSE:
            logger.info(f"[{req_id}] process_document called: normalize={normalize}, payload_bytes={payload_bytes}, orig_size={orig_w}x{orig_h}")

        # Resize for stability if image is very large, but remember scaling to map back
        img = orig_img.copy()
        scaled = False
        scale_x = scale_y = 1.0
        MAX_DIM = 1600
        if max(orig_w, orig_h) > MAX_DIM:
            factor = MAX_DIM / float(max(orig_w, orig_h))
            new_w, new_h = int(orig_w * factor), int(orig_h * factor)
            img = cv2.resize(orig_img, (new_w, new_h), interpolation=cv2.INTER_AREA)
            scaled = True
            scale_x = orig_w / float(new_w)
            scale_y = orig_h / float(new_h)

        model = get_yolo_model()
        # Time the prediction for diagnostics
        pred_start = time.time()
        results = model.predict(img, conf=CONFIDENCE, verbose=False)
        pred_ms = int((time.time() - pred_start) * 1000)
        # Summarize prediction
        try:
            num_results = len(results)
            num_masks = sum(1 for r in results if hasattr(r, 'masks') and r.masks is not None)
            num_boxes = sum(1 for r in results if getattr(r, 'boxes', None) is not None)
            conf_samples = []
            for r in results:
                try:
                    confs = getattr(r, 'boxes', None)
                    if confs is not None and hasattr(confs, 'conf'):
                        ct = list(confs.conf.cpu().numpy()) if hasattr(confs.conf, 'cpu') else list(confs.conf)
                        conf_samples.extend([float(c) for c in ct])
                except Exception:
                    continue
            conf_samples = sorted(conf_samples, reverse=True)[:5]
            if VISION_VERBOSE:
                logger.info(f"[process_document] req=auto pred_ms={pred_ms}ms results={num_results} masks={num_masks} boxes={num_boxes} top_confs={conf_samples}")
        except Exception:
            logger.exception('Failed to summarize YOLO prediction')

        detections = []  # each: { label, contour (np.array Nx1x2), area }
        for r in results:
            # Determine label (best-effort)
            label = None
            try:
                boxes = getattr(r, 'boxes', None)
                if boxes is not None and hasattr(boxes, 'cls'):
                    cls_iter = list(boxes.cls.cpu().numpy()) if hasattr(boxes.cls, 'cpu') else list(boxes.cls)
                    if cls_iter and len(cls_iter) > 0:
                        idx = int(cls_iter[0])
                        if hasattr(r, 'names') and idx in r.names:
                            label = r.names[idx]
                if label is None and hasattr(r, 'names') and isinstance(r.names, dict):
                    # best-effort fallback
                    label = list(r.names.values())[0] if len(r.names) > 0 else 'document'
            except Exception:
                label = 'document'

            # masks (preferred)
            if hasattr(r, 'masks') and r.masks is not None:
                for mask in r.masks.data:
                    m = mask.cpu().numpy()
                    m = (m * 255).astype('uint8')
                    if m.shape[0] != img.shape[0] or m.shape[1] != img.shape[1]:
                        m = cv2.resize(m, (img.shape[1], img.shape[0]), interpolation=cv2.INTER_NEAREST)
                    contours, _ = cv2.findContours(m, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
                    if not contours:
                        continue
                    c = max(contours, key=cv2.contourArea)
                    area = float(cv2.contourArea(c))
                    detections.append({'label': label or 'document', 'contour': c, 'area': area})

            # boxes fallback
            if not hasattr(r, 'masks') or r.masks is None:
                boxes = getattr(r, 'boxes', None)
                if boxes is not None and hasattr(boxes, 'xyxy'):
                    xys_iter = list(boxes.xyxy.cpu().numpy()) if hasattr(boxes.xyxy, 'cpu') else list(boxes.xyxy)
                    for xy in xys_iter:
                        x1, y1, x2, y2 = [int(float(v)) for v in xy]
                        c = np.array([[[x1, y1]], [[x2, y1]], [[x2, y2]], [[x1, y2]]])
                        area = float((x2 - x1) * (y2 - y1))
                        detections.append({'label': label or 'document', 'contour': c, 'area': area})

        if not detections:
            # fallback full padded image
            pts = padded_full_image_corners(orig_w, orig_h)
            pts_out = [{'x': round(x / float(orig_w), 6), 'y': round(y / float(orig_h), 6)} for x, y in pts]
            return JSONResponse({'ok': True, 'points': pts_out, 'label': 'none', 'image_size': {'width': orig_w, 'height': orig_h}})

        best = max(detections, key=lambda d: d['area'])
        cnt = best['contour']
        # Simplify polygon aggressively to try to force 4 points
        peri = cv2.arcLength(cnt, True)
        approx = None
        for eps in [0.12, 0.08, 0.05, 0.03]:
            try:
                a = cv2.approxPolyDP(cnt, eps * peri, True)
                if len(a) == 4:
                    approx = a
                    break
            except Exception:
                continue
        if approx is None:
            # fallback to bounding quad (minAreaRect)
            try:
                rect = cv2.minAreaRect(cnt)
                box = cv2.boxPoints(rect)
                approx = np.array([[[int(round(x)), int(round(y))]] for x, y in box])
            except Exception:
                approx = cv2.approxPolyDP(cnt, 0.01 * peri, True)

        poly = [tuple(map(int, p[0])) for p in approx]

        # Map back to original image coordinates if scaled
        if scaled:
            poly = [ (int(round(x * scale_x)), int(round(y * scale_y))) for (x, y) in poly ]

        # Build output normalized points (0..1)
        pts_out = [{'x': round(x / float(orig_w), 6), 'y': round(y / float(orig_h), 6)} for x, y in poly]

        # Emit structured debug log for this request (append JSONL to /tmp)
        try:
            log_entry = {
                'req_id': req_id,
                'ts': req_ts,
                'payload_bytes': payload_bytes,
                'model': 'yolov26',
                'method': 'mask_based' if any(hasattr(r, 'masks') and r.masks is not None for r in results) else 'box_based',
                'chosen_poly_px': poly,
                'chosen_poly_norm': pts_out,
                'image_size': {'width': orig_w, 'height': orig_h}
            }
            with open('/tmp/vision_requests.log', 'a') as f:
                f.write(json.dumps(log_entry) + '\n')
            if VISION_VERBOSE:
                logger.info(f"[process_document] req={req_id} chosen_poly_norm={pts_out} image_size={orig_w}x{orig_h}")
        except Exception:
            logger.exception('Failed writing vision_requests.log')

        resp_payload = {'ok': True, 'points': pts_out, 'label': best.get('label', 'document'), 'quad': [{'x': round(p[0] / float(orig_w), 6), 'y': round(p[1] / float(orig_h), 6)} for p in poly], 'image_size': {'width': orig_w, 'height': orig_h}}
        if VISION_VERBOSE:
            resp_payload['vision_log_id'] = req_id

        return JSONResponse(resp_payload)

    except Exception as e:
        logger.exception('process_document failed: %s', e)
        raise HTTPException(500, str(e))


@app.post("/restore")
async def restore_endpoint(
    image: UploadFile = File(...),
    stream: int = Form(0),
    parse_invoice: int = Form(1),
):
    """Full pipeline: detect -> crop -> parse with Ollama
    
    Args:
        image: Document image
        stream: 1 for SSE streaming, 0 for JSON response
        parse_invoice: 1 to parse with Ollama, 0 to skip
    """
    
    async def generate():
        try:
            # Read image
            contents = await image.read()
            nparr = np.frombuffer(contents, np.uint8)
            img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
            
            if img is None:
                yield f"data: {json.dumps({'stage': 'error', 'error': 'Invalid image'})}\n\n"
                return
            
            # Downscale very large inputs to avoid native crashes / OOM
            h, w = img.shape[:2]
            MAX_DIM = 1600
            if max(w, h) > MAX_DIM:
                scale = MAX_DIM / float(max(w, h))
                new_w, new_h = int(w * scale), int(h * scale)
                img = cv2.resize(img, (new_w, new_h), interpolation=cv2.INTER_AREA)
                logger.info(f"Resized input image from {w}x{h} to {new_w}x{new_h} to limit memory usage")
                h, w = img.shape[:2]
            
            # Stage 1: Original
            yield f"data: {json.dumps({'stage': 'original', 'size': {'w': w, 'h': h}})}\n\n"
            
            # Stage 2: Detect & crop (vision-first policy)
            corners, method = detect_document_corners(img)
            if corners is None:
                # If detection is not confident, do NOT perform risky cropping; send padded full image instead
                pad = NO_CROP_PADDING
                logger.info(f'No reliable YOLO crop >= {YOLO_CROP_CONF}; using full image with {pad*100:.1f}% padding')
                corners = padded_full_image_corners(w, h, pad=pad)
                method = method or 'full_padded'
            else:
                logger.info(f'Corners detected (method={method}): {corners}')

            yield f"data: {json.dumps({'stage': 'crop', 'corners': [{'x': int(x), 'y': int(y)} for x, y in corners], 'method': method})}\n\n"

            # Warp
            try:
                warped = four_point_warp(img, corners)
                logger.info(f'Warped image size: {warped.shape[1]}x{warped.shape[0]}')
                # Save warp for debugging
                try:
                    samples_dir = '/tmp/vision_intermediate'
                    os.makedirs(samples_dir, exist_ok=True)
                    ts = int(time.time())
                    warp_fname = os.path.join(samples_dir, f'warp_{ts}.jpg')
                    cv2.imwrite(warp_fname, warped)
                    logger.info(f'Wrote warp image: {warp_fname}')
                except Exception:
                    logger.exception('Failed saving warp image')
            except Exception as e:
                logger.exception(f'Warp failed: {e}')
                warped = img.copy()

            # Stage: detect fields on the warped crop and yield them to the stream (best-effort)
            try:
                fields = detect_invoice_fields(warped)
                yield f"data: {json.dumps({'stage': 'fields', 'fields': fields})}\n\n"
            except Exception:
                fields = []


            # Stage 3: Restored (enhanced)
            try:
                # Better color-aware enhancement pipeline and multiple variants
                variants = {}

                lab = cv2.cvtColor(warped, cv2.COLOR_BGR2LAB)
                l, a, b = cv2.split(lab)
                clahe = cv2.createCLAHE(clipLimit=ENH_CLAHE_CLIP, tileGridSize=(8, 8))
                l2 = clahe.apply(l)
                lab2 = cv2.merge((l2, a, b))
                variants['enhanced_color'] = cv2.cvtColor(lab2, cv2.COLOR_LAB2BGR)

                # Colored denoise
                den = cv2.fastNlMeansDenoisingColored(variants['enhanced_color'], None, h=int(ENH_DENOISE_H), hColor=max(3, int(ENH_DENOISE_H/2)), templateWindowSize=7, searchWindowSize=21)
                variants['denoised'] = den

                # Light unsharp
                blurred = cv2.GaussianBlur(den, (0, 0), sigmaX=1.0)
                sharpened = cv2.addWeighted(den, 1.08, blurred, -0.08, 0)
                variants['sharpened'] = sharpened

                # Mild adaptive threshold blend to boost ink contrast
                try:
                    # Compute luminance without cvtColor to keep color-space operations explicit
                    gray_tmp = (0.299 * sharpened[:, :, 2] + 0.587 * sharpened[:, :, 1] + 0.114 * sharpened[:, :, 0]).astype('uint8')
                    th = cv2.adaptiveThreshold(gray_tmp, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY, 25, 7)
                    th_color = cv2.cvtColor(th, cv2.COLOR_GRAY2BGR)
                    alpha = 0.85
                    blended = cv2.addWeighted(sharpened, alpha, th_color, 1.0 - alpha, 0)
                    variants['threshold_blend'] = blended
                except Exception:
                    variants['threshold_blend'] = sharpened

                # Candidate chosen by default is enhanced_color (better for OCR); fallback to threshold_blend
                restored = variants.get('enhanced_color', variants.get('threshold_blend'))

                # DocRes has been removed from the default pipeline to keep the service focused on YOLO + Ollama.
                # Previously there was optional DocRes inference here; it has been intentionally removed.

                # ensure final dtype
                if restored.dtype != 'uint8':
                    restored = np.clip(restored, 0, 255).astype('uint8')

                # Save variants for debug
                try:
                    samples_dir = '/tmp/vision_restored_candidates'
                    os.makedirs(samples_dir, exist_ok=True)
                    ts = int(time.time())
                    for name, imgv in variants.items():
                        cv2.imwrite(os.path.join(samples_dir, f'{name}_{ts}.jpg'), imgv)
                except Exception:
                    pass

            except Exception as e:
                logger.exception(f'Enhancement failed: {e}')
                restored = warped.copy()

            # Final restored image (BGR)
            restored_b64 = img_to_base64(restored)

            # Basic sanity checks: if restored image is nearly blank, save sample for debugging
            try:
                mean_val = float(np.mean(restored))
                std_val = float(np.std(restored))
                logger.info(f"Restored image stats: mean={mean_val:.2f}, std={std_val:.2f}")
                if mean_val < 3 or std_val < 2 or mean_val > 252:
                    samples_dir = '/tmp/vision_failed_restores'
                    os.makedirs(samples_dir, exist_ok=True)
                    ts = int(time.time())
                    fname_warp = os.path.join(samples_dir, f'warp_{ts}.jpg')
                    fname_rest = os.path.join(samples_dir, f'restored_{ts}.jpg')
                    cv2.imwrite(fname_warp, warped)
                    cv2.imwrite(fname_rest, restored)
                    logger.warning(f"Restored image failed sanity check (mean={mean_val:.2f}, std={std_val:.2f}). Saved {fname_warp} and {fname_rest} for inspection")
            except Exception:
                logger.exception('Error checking restored image stats')

            logger.info('Yielding restored stage (preview length=%d)' % len(restored_b64))
            yield f"data: {json.dumps({'stage': 'restored', 'preview_base64': restored_b64})}\n\n"
            
            # Stage 4: Parse with Ollama
            if parse_invoice:
                prompt = """Extrae los datos de esta factura y devuelve SOLO JSON válido EXACTAMENTE con este esquema:
{
  "emisor": {"nombre": "", "cuit": ""},
  "documento": {"numero": "", "fecha": "DD/MM/AAAA", "totales": {"total_impreso": "revisar"}},
  "items": [{"descripcion": "", "cantidad": "revisar", "precio_unitario": "revisar", "subtotal": "revisar"}]
}
Reglas estrictas:
- Devuelve únicamente el JSON (sin texto adicional ni explicaciones).
- Si NO puedes leer un campo con confianza, escribe la cadena "revisar" (no uses null).
- Para fechas intenta normalizar a DD/MM/AAAA; si no es posible escribe "revisar".
- Para números devuelve floats (ej: 1234.56) cuando sea posible; si no, escribe "revisar".
- Si hay varias líneas tipo 'total', escoge la más probable (valor más alto) y úsala en 'total_impreso'.
- Devuelve 'items' como lista; si no detectas ítems válidos, devuelve [].
- No agregues campos extra ni comentarios.
- Qwen debe realizar la lectura OCR a partir de la imagen que recibe (no usar OCR externo).
"""
                
                try:
                    # Prepare a smaller image payload for Ollama (keep the preview quality separate)
                    try:
                        img_for_ollama, sent_len = _make_ollama_image_data(restored, max_w=1200, quality=80)
                    except Exception:
                        img_for_ollama = restored_b64  # fallback to previously encoded preview

                    logger.info(f'Sending image to Ollama (len={len(img_for_ollama) if img_for_ollama else 0})')
                    result = call_ollama_generate(prompt, img_for_ollama, keep_alive=-1)
                    response_text = result.get('response', '')

                    # Parse JSON
                    parsed = extract_json_from_text(response_text)

                    if parsed:
                        ts = int(time.time())
                        analysis_by = os.environ.get('ANALYSIS_BY', 'vision-service')
                        yield f"data: {json.dumps({'stage': 'final', 'extraction': parsed, 'model': 'ollama', 'parsed': True, 'analysis_by': analysis_by, 'analysis_ts': ts})}\n\n"
                    else:
                        # Try a fallback parse WITHOUT the image (some invoices parse better from text prompt only)
                        try:
                            logger.info('Initial Ollama parse failed, retrying without image')
                            retry_result = call_ollama_generate(prompt, None, keep_alive=-1)
                            retry_text = retry_result.get('response', '')
                            retry_parsed = extract_json_from_text(retry_text)
                            if retry_parsed:
                                logger.info('Retry without image succeeded')
                                ts = int(time.time())
                                analysis_by = os.environ.get('ANALYSIS_BY', 'vision-service')
                                yield f"data: {json.dumps({'stage': 'final', 'extraction': retry_parsed, 'model': 'ollama', 'parsed': True, 'retry_no_image': True, 'analysis_by': analysis_by, 'analysis_ts': ts})}\n\n"
                                return
                        except Exception:
                            logger.exception('Retry without image failed')

                        # Save full Ollama response for debugging
                        try:
                            ts = int(time.time())
                            os.makedirs('/tmp/vision_ollama_debug', exist_ok=True)
                            open(f'/tmp/vision_ollama_debug/rawresp_{ts}.txt', 'w').write(str(result))
                        except Exception:
                            pass
                        ts = int(time.time())
                        analysis_by = os.environ.get('ANALYSIS_BY', 'vision-service')
                        yield f"data: {json.dumps({'stage': 'final', 'extraction': {}, 'raw': response_text[:500], 'parsed': False, 'analysis_by': analysis_by, 'analysis_ts': ts})}\n\n"

                except Exception as e:
                    logger.error(f"Ollama parsing error: {e}")
                    yield f"data: {json.dumps({'stage': 'error', 'error': f'Parsing failed: {e}'})}\n\n"
            else:
                ts = int(time.time())
                analysis_by = os.environ.get('ANALYSIS_BY', 'vision-service')
                yield f"data: {json.dumps({'stage': 'final', 'parse_skipped': True, 'analysis_by': analysis_by, 'analysis_ts': ts})}\n\n"
                
        except Exception as e:
            logger.exception(f"Restore pipeline error: {e}")
            yield f"data: {json.dumps({'stage': 'error', 'error': str(e)})}\n\n"
    
    if stream:
        return StreamingResponse(
            generate(),
            media_type="text/event-stream",
            headers={
                "Cache-Control": "no-cache",
                "X-Accel-Buffering": "no"
            }
        )
    else:
        # Collect events, preserve 'restored' preview so non-stream clients get it
        result = {}
        restored_preview = None
        async for event in generate():
            if event.startswith('data: '):
                try:
                    payload = json.loads(event[6:])
                    # Preserve restored preview if present
                    if payload.get('stage') == 'restored' and payload.get('preview_base64'):
                        restored_preview = payload.get('preview_base64')
                    result = payload
                except Exception:
                    pass
        # Attach restored preview to final payload if available (always attach for non-stream clients)
        if restored_preview and isinstance(result, dict):
            result['restored_image_base64'] = restored_preview
            logger.info('Attached restored preview to non-stream response')
        # Attach analysis metadata
        if isinstance(result, dict):
            result['analysis'] = {'by': os.environ.get('ANALYSIS_BY', 'vision-service'), 'ts': int(time.time())}
        return JSONResponse(result)


# --- Debugging helper: return last JSONL logs from /tmp/vision_requests.log ---
@app.get("/debug/logs")
async def debug_logs(limit: int = 50):
    """Return the last `limit` entries written to /tmp/vision_requests.log (if present)."""
    try:
        path = '/tmp/vision_requests.log'
        if not os.path.exists(path):
            return JSONResponse({'ok': False, 'reason': 'no_logs'})
        with open(path, 'r') as f:
            lines = f.read().strip().split('\n')
        lines = [l for l in lines if l.strip()]
        if not lines:
            return JSONResponse({'ok': False, 'reason': 'no_logs'})
        # take last `limit` lines
        selected = lines[-limit:]
        parsed = []
        for l in selected:
            try:
                parsed.append(json.loads(l))
            except:
                parsed.append({'raw': l})
        return JSONResponse({'ok': True, 'count': len(parsed), 'entries': parsed})
    except Exception:
        logger.exception('debug/logs read failed')
        return JSONResponse({'ok': False, 'reason': 'error'})


@app.post('/debug/trace')
async def debug_trace_endpoint(payload: dict):
    """Accept client-side traces and append to /tmp/vision_client_traces.log for later inspection"""
    try:
        ts = int(time.time())
        entry = {'ts': ts, 'payload': payload}
        with open('/tmp/vision_client_traces.log', 'a') as f:
            f.write(json.dumps(entry) + '\n')
        if VISION_VERBOSE:
            logger.info(f"[debug/trace] appended trace (len={len(payload.get('trace', [])) if isinstance(payload, dict) else 'unknown'})")
        return JSONResponse({'ok': True, 'ts': ts})
    except Exception:
        logger.exception('debug/trace failed')
        return JSONResponse({'ok': False, 'reason': 'error'})


# --- Models endpoints: list available and request load ---
@app.get("/models")
async def models_endpoint():
    """Return list of available IA components (heuristic, yolo, ollama models)
    Format: { available: [{ name, type, loaded, present }, ...] }
    """
    available = []

    # heuristic fallback always present
    available.append({'name': 'heuristic/parser', 'type': 'heuristic', 'loaded': True, 'present': True})

    # YOLO
    try:
        yolo_present = os.path.exists(MODEL_PATH)
        # If model file exists but not loaded yet, attempt a quick load so UI shows correct state
        if yolo_present and _yolo_model is None:
            try:
                logger.info('models_endpoint: found YOLO file, attempting to load')
                _ = get_yolo_model()
            except Exception:
                logger.exception('models_endpoint: loading YOLO failed')
        available.append({'name': 'yolo/seg', 'type': 'vision', 'loaded': _yolo_model is not None, 'present': yolo_present})
    except Exception:
        available.append({'name': 'yolo/seg', 'type': 'vision', 'loaded': False, 'present': False})

    # DocRes support has been removed from the default pipeline. The service focuses on YOLO + Ollama.

    # Ollama-exposed models (query Ollama API)
    try:
        resp = requests.get(f"{OLLAMA_HOST}/api/tags", timeout=2)
        if resp.status_code == 200:
            data = resp.json()
            models = data.get('models') or data.get('models', [])
            # models may be list of names or dicts
            for m in models:
                if isinstance(m, str):
                    name = m
                elif isinstance(m, dict):
                    name = m.get('name') or m.get('id')
                else:
                    continue
                available.append({'name': name, 'type': 'ollama', 'loaded': True, 'present': True})
    except Exception:
        # Ollama not available, ignore
        pass

    return JSONResponse({'ok': True, 'available': available})


@app.post('/models/load')
async def models_load(request: 'fastapi.Request'):
    """Request the vision service to load a model into memory (e.g., ask Ollama to pull a model)
    Accepts JSON body: { model: 'qwen2.5vl:7b' }
    """
    try:
        payload = await request.json()
        model = payload.get('model')
        if not model:
            return JSONResponse({'ok': False, 'error': 'model required'}, status_code=400)

        # If model looks like an Ollama model, attempt ollama pull
        if 'qwen' in model or ':' in model or 'ollama' in model:
            try:
                import shutil
                if shutil.which('ollama') is None:
                    return JSONResponse({'ok': False, 'error': 'ollama_not_installed', 'details': 'ollama binary not found in PATH'}, status_code=500)
                p = subprocess.run(['ollama', 'pull', model], capture_output=True, text=True, timeout=600)
                if p.returncode != 0:
                    logger.error('ollama pull failed: %s', p.stderr)
                    return JSONResponse({'ok': False, 'error': 'pull_failed', 'details': p.stderr}, status_code=500)
                return JSONResponse({'ok': True, 'result': p.stdout})
            except Exception as e:
                logger.exception('models_load exception: %s', e)
                return JSONResponse({'ok': False, 'error': 'exception', 'details': str(e)}, status_code=500)

        # Unsupported model type for loading via vision
        return JSONResponse({'ok': False, 'error': 'unsupported_model_type'}, status_code=400)
    except Exception as e:
        logger.exception('models_load invalid_json: %s', e)
        return JSONResponse({'ok': False, 'error': 'invalid_json', 'details': str(e)}, status_code=400)


@app.get("/status")
async def status_endpoint():
    """Health and model status"""
    try:
        import torch
        cuda_available = torch.cuda.is_available()
        gpu_name = torch.cuda.get_device_name(0) if cuda_available else None
        vram_total = torch.cuda.get_device_properties(0).total_memory / 1024**3 if cuda_available else 0
    except:
        cuda_available = False
        gpu_name = None
        vram_total = 0
    
    # Check Ollama
    ollama_ready = False
    ollama_models = []
    try:
        resp = requests.get(f"{OLLAMA_HOST}/api/tags", timeout=5)
        if resp.status_code == 200:
            ollama_ready = True
            data = resp.json()
            ollama_models = [m.get('name') for m in data.get('models', [])]
    except:
        pass
    
    # Derive explicit model names for reporting consistency
    loaded_models = []

    # Ollama models (if any)
    if ollama_models:
        loaded_models.extend([m for m in ollama_models if m])

    # YOLO: if model path exists and YOLO is loaded, derive a model name from the filename
    yolo_model_name = None
    try:
        if _yolo_model is not None or (os.path.exists(MODEL_PATH)):
            basename = os.path.basename(MODEL_PATH)
            yolo_model_name = os.path.splitext(basename)[0]
            loaded_models.append(yolo_model_name)
    except Exception:
        yolo_model_name = None

    # Normalize unique names
    loaded_models = list(dict.fromkeys([s for s in loaded_models if s]))

    # qwen presence inference
    qwen_present = any(OLLAMA_MODEL == m or (m and OLLAMA_MODEL.split(':')[0] in m) for m in ollama_models)

    # Build a unified models list: ollama models first, then yolo model (if present)
    unified_models = []
    if ollama_models:
        unified_models.extend([m for m in ollama_models if m])
    if yolo_model_name:
        if yolo_model_name not in unified_models:
            unified_models.append(yolo_model_name)

    # Ensure loaded_models reflects unified list
    for m in unified_models:
        if m and m not in loaded_models:
            loaded_models.append(m)

    return JSONResponse({
        "ok": True,
        "service": "vision-ai",
        "models": unified_models,
        "cuda": {
            "available": cuda_available,
            "gpu": gpu_name,
            "vram_gb": round(vram_total, 1)
        },
        "ollama": {
            "ready": ollama_ready,
            "host": OLLAMA_HOST,
            "models": ollama_models,
            "configured_model": OLLAMA_MODEL,
            "qwen_present": qwen_present
        },
        "yolo": {
            "loaded": _yolo_model is not None,
            "path": MODEL_PATH,
            "model": yolo_model_name,
            "models": ([yolo_model_name] if yolo_model_name else [])
        },
        "services": [
            {"name": "yolo/seg", "source": "ranitas-vision", "models": ([yolo_model_name] if yolo_model_name else []), "type": "vision"},
            {"name": "ollama", "source": "ranitas-vision", "models": ollama_models, "type": "llm"}
        ],
        "loadedModels": loaded_models
    })


@app.post('/debug/restore')
async def debug_restore(image: UploadFile = File(...)):
    """Debug endpoint: run detect+warp+enhance but do NOT call Ollama.
    Returns small previews (resized) and metrics (area_ratio, rect_fill, aspect) to diagnose bad crops.
    """
    try:
        contents = await image.read()
        nparr = np.frombuffer(contents, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        if img is None:
            return JSONResponse({'ok': False, 'error': 'invalid_image'}, status_code=400)

        h, w = img.shape[:2]
        # Limit size
        MAX_DIM = 1600
        if max(w, h) > MAX_DIM:
            scale = MAX_DIM / float(max(w, h))
            img = cv2.resize(img, (int(w*scale), int(h*scale)), interpolation=cv2.INTER_AREA)
            h, w = img.shape[:2]

        corners = detect_document_corners(img)
        used_fallback = corners is None
        if corners is None:
            corners = fallback_corners(w, h)

        warped = four_point_warp(img, corners)

        # Use the same color-aware enhancement as production restore for consistent previews
        variants = {}
        try:
            lab = cv2.cvtColor(warped, cv2.COLOR_BGR2LAB)
            l, a, b = cv2.split(lab)
            clahe = cv2.createCLAHE(clipLimit=ENH_CLAHE_CLIP, tileGridSize=(8, 8))
            l2 = clahe.apply(l)
            lab2 = cv2.merge((l2, a, b))
            variants['enhanced_color'] = cv2.cvtColor(lab2, cv2.COLOR_LAB2BGR)

            variants['denoised'] = cv2.fastNlMeansDenoisingColored(variants['enhanced_color'], None, h=10, hColor=6, templateWindowSize=7, searchWindowSize=21)
            blurred = cv2.GaussianBlur(variants['denoised'], (0,0), sigmaX=1.0)
            variants['sharpened'] = cv2.addWeighted(variants['denoised'], 1.08, blurred, -0.08, 0)

            # Mild adaptive threshold blend to boost ink contrast
            try:
                # Compute luminance explicitly to avoid converting to grayscale
                gray_tmp = (0.299 * variants['sharpened'][:, :, 2] + 0.587 * variants['sharpened'][:, :, 1] + 0.114 * variants['sharpened'][:, :, 0]).astype('uint8')
                th = cv2.adaptiveThreshold(gray_tmp, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY, 25, 7)
                th_color = cv2.cvtColor(th, cv2.COLOR_GRAY2BGR)
                alpha = 0.85
                variants['threshold_blend'] = cv2.addWeighted(variants['sharpened'], alpha, th_color, 1.0-alpha, 0)
            except Exception:
                variants['threshold_blend'] = variants['sharpened']
        except Exception:
            variants['threshold_blend'] = warped.copy()

        # Metrics
        pts = np.array(corners)
        # Ensure correct dtype for OpenCV contour functions (float32 or int32)
        area = cv2.contourArea(pts.astype(np.float32))
        area_ratio = area / float(w*h)
        bx, by, bw, bh = cv2.boundingRect(pts.astype('int32'))
        rect_area = float(bw*bh) if bw>0 and bh>0 else 0
        rect_fill = (area / rect_area) if rect_area>0 else 0
        aspect = (bw/float(bh) if bh>0 else 0)

        # Previews (small thumbnails)
        def small_b64(img_np, max_w=800):
            h0, w0 = img_np.shape[:2]
            if w0 > max_w:
                scale = max_w / float(w0)
                img_np = cv2.resize(img_np, (int(w0*scale), int(h0*scale)), interpolation=cv2.INTER_AREA)
            return img_to_base64(img_np, quality=85)

        # Include restoration variants for debugging
        try:
            variants_b64 = {}
            for name, imgv in variants.items():
                variants_b64[name] = small_b64(imgv)
        except Exception:
            variants_b64 = {}

        ts = int(time.time())
        analysis_by = os.environ.get('ANALYSIS_BY', 'vision-service')
        return JSONResponse({
            'ok': True,
            'used_fallback': used_fallback,
            'corners': [{'x': int(x), 'y': int(y)} for x, y in corners],
            'metrics': {'area_ratio': round(area_ratio, 4), 'rect_fill': round(rect_fill, 4), 'aspect': round(aspect, 2)},
            'preview': small_b64(img),
            'warp_preview': small_b64(warped),
            'restored_preview': small_b64(variants.get('threshold_blend', warped)),
            'restoration_variants': variants_b64,
            'analysis': {'by': analysis_by, 'ts': ts}
        })
    except Exception as e:
        logger.exception('debug_restore failed')
        return JSONResponse({'ok': False, 'error': str(e)}, status_code=500)


@app.get("/")
async def root():
    return {"message": "Vision AI Service - Ready", "docs": "/docs"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
