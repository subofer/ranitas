#!/usr/bin/env python3
"""DocRes + YOLO audit and integration script

This script checks dependencies, GPU status, model files and performs a small end-to-end
inference: detect (YOLO) -> crop -> restore (DocRes) -> postprocess -> save result.

It logs clear messages about missing components and prints actionable hints.

Usage:
  python services/yolo/docres_audit.py --image /path/to/example.jpg

"""

import os
import sys
import argparse
import traceback

from datetime import datetime

def ts():
    return datetime.now().strftime('%Y-%m-%d %H:%M:%S,%f')[:-3]

def log(msg, emoji=''):
    print(f"{ts()} {emoji} {msg}")

# Argument parsing
parser = argparse.ArgumentParser()
parser.add_argument('--image', '-i', help='Path to an input image to test', default=None)
parser.add_argument('--yolo-path', help='Path to YOLO model file', default=os.environ.get('YOLO_MODEL_PATH', os.path.join(os.path.dirname(__file__), 'yoloe-26n-seg.pt')))
parser.add_argument('--quiet', action='store_true', help='Suppress informational output')
args = parser.parse_args()

if not args.quiet:
    log('🚀 Starting lightweight Vision audit (YOLO + Ollama checks only)')
    log(f'YOLO model path: {args.yolo_path}')

# Step 1: Check basic dependencies
missing = []
try:
    import numpy as np
    if not args.quiet:
        print('numpy:', np.__version__)
except Exception as e:
    eprint('MISSING: numpy ->', e)
    missing.append('numpy')

try:
    import cv2
    if not args.quiet:
        print('opencv (cv2):', cv2.__version__)
except Exception as e:
    eprint('MISSING: opencv (cv2) ->', e)
    missing.append('opencv')

try:
    import torch
    if not args.quiet:
        print('torch:', getattr(torch, '__version__', 'unknown'))
except Exception as e:
    eprint('MISSING: torch ->', e)
    missing.append('torch')

try:
    from PIL import Image
    if not args.quiet:
        print('Pillow:', Image.__version__)
except Exception as e:
    eprint('MISSING: Pillow ->', e)
    missing.append('pillow')

try:
    from ultralytics import YOLO
    if not args.quiet:
        print('ultralytics YOLO: available')
except Exception as e:
    eprint('ultralytics (YOLO) not available ->', e)
    # not fatal for restoration but for detection

# Simplified: DocRes removed from workflow. Only warn if core libs missing
if missing:
    eprint('\nERROR: Missing required Python packages:', ', '.join(missing))
    eprint('Install them in the YOLO service virtualenv: python -m pip install -r services/yolo/requirements.txt')

# Step 2: Hardware checks
using_torch = 'torch' not in missing
if using_torch:
    try:
        if not args.quiet:
            print('\nTorch CUDA available:', torch.cuda.is_available())
        if torch.cuda.is_available():
            try:
                dev = torch.device('cuda')
                if not args.quiet:
                    print('CUDA device count:', torch.cuda.device_count())
                # Try to get memory info (best effort)
                try:
                    from torch.cuda import memory_allocated, memory_reserved
                    if not args.quiet:
                        print('GPU memory allocated (bytes):', torch.cuda.memory_allocated())
                        print('GPU memory reserved  (bytes):', torch.cuda.memory_reserved())
                except Exception as e:
                    # Newer torch has mem_get_info
                    try:
                        free, total = torch.cuda.mem_get_info()
                        if not args.quiet:
                            print('GPU memory (free, total):', free, total)
                    except Exception:
                        if not args.quiet:
                            print('GPU memory info not available via torch API')
            except Exception as e:
                eprint('Error querying CUDA info:', e)
    except Exception as e:
        eprint('Torch/CUDA check failed:', e)

# Step 3: Verify YOLO model file
if not os.path.exists(args.yolo_path):
    eprint('YOLO model file not found at:', args.yolo_path)
else:
    if not args.quiet:
        log(f'✅ YOLO model file found at: {args.yolo_path}', '✅')

# Check Ollama / qwen presence
OLLAMA_HOST = os.environ.get('OLLAMA_HOST', 'http://127.0.0.1:11434')
OLLAMA_MODEL = os.environ.get('OLLAMA_MODEL', 'qwen2.5vl:7b')
try:
    import requests
    if not args.quiet:
        log('🧠 Checking Ollama availability...')
    resp = requests.get(f"{OLLAMA_HOST}/api/tags", timeout=5)
    if resp.status_code == 200:
        models = [m.get('name') for m in resp.json().get('models', [])]
        if OLLAMA_MODEL in models:
            log(f'ℹ️ Model {OLLAMA_MODEL} present locally')
        else:
            log(f'⚠️ Model {OLLAMA_MODEL} not present locally')
    else:
        log(f'⚠️ Ollama probe returned status {resp.status_code}')
except Exception as e:
    eprint('Ollama check failed:', e)

# Helper: safe model loader for DocRes
def try_load_docres(path, device):
    try:
        import importlib
        spec = importlib.util.find_spec('docres')
        if spec is None:
            eprint('docres package is not installed.')
            return None
        from docres import DocRes
        if not args.quiet:
            print('Attempting to instantiate DocRes model...')
        model = DocRes(path)
        # If model has .to or .to(device) method, move it
        try:
            if hasattr(model, 'to'):
                model.to(device)
            elif hasattr(model, 'cuda') and device.type == 'cuda':
                model.cuda()
            if not args.quiet:
                print('Model moved to device:', device)
        except Exception as e:
            eprint('Warning: could not move DocRes model to device:', e)
        return model
    except Exception as e:
        eprint('Failed to load DocRes (exception):', e)
        traceback.print_exc()
        return None

# Helper: generic restore using torch tensor pipeline
def restore_with_torch_model(model, img_bgr_np, device):
    """Preprocess -> model -> postprocess. img_bgr_np is HxWx3 uint8 (BGR as from cv2)
    Returns restored_bgr_uint8 (HxWx3) or raises exception."""
    import torch
    # Convert BGR -> RGB
    img_rgb = img_bgr_np[:, :, ::-1].astype('float32') / 255.0  # H,W,3 in 0..1
    # To tensor C,H,W
    tensor = torch.from_numpy(img_rgb.transpose(2,0,1)).unsqueeze(0).float().to(device)
    print('Image converted to tensor:', tuple(tensor.shape), 'device ->', tensor.device)

    # Inference
    with torch.no_grad():
        try:
            # Try a few common interfaces
            if hasattr(model, 'restore'):
                out = model.restore(tensor)
            else:
                out = model(tensor)
            print('Inference completed')
        except Exception as e:
            eprint('Model inference failed:', e)
            traceback.print_exc()
            raise

    # Handle output: it may be numpy, PIL image, torch tensor, or tuple
    out_np = None
    if isinstance(out, tuple) or isinstance(out, list):
        out = out[0]

    if isinstance(out, np.ndarray):
        out_np = out
    else:
        try:
            if hasattr(out, 'detach'):
                t = out.detach().cpu()
                if t.dim() == 4:
                    t = t.squeeze(0)
                arr = t.numpy()
                # arr is C,H,W or H,W,C depending on model
                if arr.shape[0] == 3:
                    out_np = (arr.transpose(1,2,0) * 255.0).astype('uint8')
                elif arr.shape[-1] == 3:
                    out_np = (arr * 255.0).astype('uint8')
                else:
                    raise RuntimeError('Unexpected tensor shape from model: %s' % (arr.shape,))
            else:
                raise RuntimeError('Model output not recognized (neither numpy nor torch tensor)')
        except Exception as e:
            eprint('Could not convert model output to numpy image:', e)
            traceback.print_exc()
            raise

    # If out_np is RGB in 0..255, convert to BGR uint8
    if out_np is not None:
        if out_np.dtype != 'uint8':
            out_np = np.clip(out_np, 0, 255).astype('uint8')
        # If color channels are last and in RGB order, convert to BGR
        if out_np.shape[-1] == 3:
            out_bgr = out_np[:, :, ::-1]
        else:
            raise RuntimeError('Unexpected image shape after processing: %s' % (out_np.shape,))

        # Postprocessing: increase contrast slightly while preserving ink
        try:
            lab = cv2.cvtColor(out_bgr, cv2.COLOR_BGR2LAB)
            l, a, b = cv2.split(lab)
            clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8,8))
            l2 = clahe.apply(l)
            lab2 = cv2.merge((l2, a, b))
            enhanced = cv2.cvtColor(lab2, cv2.COLOR_LAB2BGR)
            # Light unsharp mask
            blurred = cv2.GaussianBlur(enhanced, (0,0), sigmaX=1.0)
            final = cv2.addWeighted(enhanced, 1.08, blurred, -0.08, 0)
            return final
        except Exception as e:
            eprint('Postprocessing failed, returning raw model output:', e)
            return out_bgr

    raise RuntimeError('Restoration failed: no output image')

# Main flow - Simplified: run optional YOLO detection on provided image and report results
if __name__ == '__main__':
    img_path = args.image
    if img_path is None:
        candidate = os.path.join(os.path.dirname(__file__), 'sample.jpg')
        if os.path.exists(candidate):
            img_path = candidate
            if not args.quiet: log(f'No image specified, using sample: {img_path}')
        else:
            eprint('No input image provided. Use --image /path/to/image.jpg')
            sys.exit(1)

    # Read image
    try:
        import cv2
        img = cv2.imread(img_path, cv2.IMREAD_COLOR)
        if img is None:
            raise RuntimeError('cv2.imread failed')
        if not args.quiet: log(f'Loaded image: {img_path} shape: {img.shape}', '🖼️')
    except Exception as e:
        eprint('Failed to load image:', e)
        sys.exit(1)

    # Run YOLO detection if model exists
    try:
        from ultralytics import YOLO
        if os.path.exists(args.yolo_path):
            if not args.quiet: log('⏱ Running YOLO detection (fast)')
            yolo = YOLO(args.yolo_path)
            res = yolo(img)
            # try to extract largest box
            bxy = None
            try:
                bxy = res[0].boxes.xyxy.cpu().numpy()
            except Exception:
                bxy = None

            if bxy is not None and bxy.size:
                areas = (bxy[:,2]-bxy[:,0])*(bxy[:,3]-bxy[:,1])
                idx = int(areas.argmax())
                x1,y1,x2,y2 = bxy[idx].astype(int).tolist()
                log(f'✅ YOLO detected box: {(x1,y1,x2,y2)}')
            else:
                log('⚠️ YOLO detected no usable boxes')
        else:
            log('⚠️ YOLO model file missing, skipping detection')
    except Exception as e:
        log(f'⚠️ YOLO detection failed: {e}')

    if not args.quiet: log('Audit complete.', '✅')
