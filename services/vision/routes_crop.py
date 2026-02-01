from fastapi import APIRouter, UploadFile, File, Form
import numpy as np, cv2, base64, asyncio, json, time
from state import state
from audit import audit

router = APIRouter()

import cv2
import numpy as np

def enhance_document(image):
    # 1. Detectar ángulo usando una copia en gris
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    # Binarización para resaltar masa de texto
    thresh = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU)[1]
    coords = np.column_stack(np.where(thresh > 0))

    if len(coords) == 0: 
        return image

    angle = cv2.minAreaRect(coords)[-1]

    # Ajuste para corregir la rotación de OpenCV
    if angle < -45:
        angle = -(90 + angle)
    else:
        angle = -angle

    # 2. Aplicar rotación a la imagen original (Color)
    (h, w) = image.shape[:2]
    M = cv2.getRotationMatrix2D((w // 2, h // 2), angle, 1.0)
    rotated = cv2.warpAffine(image, M, (w, h), flags=cv2.INTER_CUBIC, borderMode=cv2.BORDER_REPLICATE)

    # 3. Limpieza de fondo (White Balance dinámico)
    # Dilatamos para promediar el color del papel y restarlo
    dilated = cv2.dilate(rotated, np.ones((7, 7), np.uint8))
    bg_img = cv2.medianBlur(dilated, 21)
    diff_img = 255 - cv2.absdiff(rotated, bg_img)

    return cv2.normalize(diff_img, None, alpha=0, beta=255, norm_type=cv2.NORM_MINMAX, dtype=cv2.CV_8U)

def _order_pts(pts):
  s = pts.sum(axis=1); diff = np.diff(pts, axis=1)
  tl = pts[np.argmin(s)]; br = pts[np.argmax(s)]; tr = pts[np.argmin(diff)]; bl = pts[np.argmax(diff)];
  return np.array([tl,tr,br,bl], dtype='float32')

@router.post('/crop')
@audit('crop')
async def crop(file: UploadFile = File(...), debug: str = Form(None), orig_len: str = Form(None), orig_md5: str = Form(None)):
  data = await file.read(); arr = np.frombuffer(data, np.uint8); img = cv2.imdecode(arr, cv2.IMREAD_COLOR)
  # Log arrival
  try:
    print(f"INFO /crop received file: {getattr(file, 'filename', getattr(file, 'filename', None))} bytes={len(data)} img_shape={tuple(img.shape) if img is not None else None} orig_len={orig_len} orig_md5={orig_md5}")
  except Exception:
    print("INFO /crop received file: <unable to log filename/shape>")
  t_start = time.time()
  model = state.get('yolo',{}).get('_model')
  if not model:
    print('WARN /crop yolo model not ready')
    return {'ok':False,'error':'yolo_not_ready'}
  loop = asyncio.get_running_loop()
  # Build class index filter from model names and our TARGETS
  names = getattr(model, 'names', {})
  if isinstance(names, dict):
    name_map = {int(k):v for k,v in names.items()}
  else:
    name_map = {i:v for i,v in enumerate(names)}
  # Build case-insensitive target set from configured targets and prompt phrases
  targets = set([s.lower() for s in state.get('TARGETS', set())]) if state.get('TARGETS') else set()
  prompt_phrases = set([s.lower() for s in state.get('PROMPT_PHRASES', [])])
  name_map_lower = {i: (v.lower() if isinstance(v,str) else v) for i,v in name_map.items()}
  # If the user configured target classes, restrict prediction to them; otherwise allow all classes
  target_idxs = [i for i,n in name_map_lower.items() if n in targets or n in prompt_phrases]
  
  # CRITICAL: Preserve aspect ratio; when image is significantly taller than wide, pad horizontally (black bars) symmetrically so YOLO receives a more balanced input
  h_img, w_img = img.shape[:2]
  pad_left = 0; pad_top = 0
  padded_img = img
  padded_h, padded_w = h_img, w_img

  # Only pad when image is notably taller than wide to avoid unnecessary padding
  try:
    tall_ratio_threshold = float(state.get('TALL_RATIO_THRESHOLD', 1.25))
  except Exception:
    tall_ratio_threshold = 1.25

  if h_img / float(max(1, w_img)) > tall_ratio_threshold:
    new_w = h_img
    pad_left = (new_w - w_img) // 2
    pad_right = new_w - w_img - pad_left
    padded_img = np.zeros((h_img, new_w, 3), dtype=img.dtype)
    padded_img[:, pad_left:pad_left + w_img] = img
    padded_h, padded_w = padded_img.shape[:2]
    try:
      print(f"INFO /crop applied horizontal padding: pad_left={pad_left}, pad_right={pad_right}, padded_size={padded_w}x{padded_h}")
    except Exception:
      pass

  # Scale down only if padded image exceeds a max allowed size (preserve ratio)
  max_allowed = int(state.get('MAX_IMG_DIM', 1280))
  scale_to_predict = 1.0
  predict_img = padded_img
  if max(padded_h, padded_w) > max_allowed:
    scale_to_predict = float(max_allowed) / float(max(padded_h, padded_w))
    new_h = max(1, int(round(padded_h * scale_to_predict)))
    new_w = max(1, int(round(padded_w * scale_to_predict)))
    predict_img = cv2.resize(padded_img, (new_w, new_h), interpolation=cv2.INTER_AREA)
    try:
      print(f"INFO /crop scaled padded image to predict size: {new_w}x{new_h} (scale={scale_to_predict:.4f})")
    except Exception:
      pass

  # Do not force imgsz here; let the model use the provided image shape and its internal letterbox handling
  predict_kwargs = {
    'source': predict_img,
    'conf': 0.3,
    'augment': False,
    'half': False,
    'verbose': False
  }
  if target_idxs:
    predict_kwargs['classes'] = target_idxs
  apply_name_filter = True if (targets or prompt_phrases) else False
  results = await loop.run_in_executor(None, lambda: model.predict(**predict_kwargs))
  r = results[0]
  # Prepare a raw debug summary from YOLO results (boxes, classes, confs, masks presence)
  raw_debug = None
  try:
    boxes_xyxy = None
    boxes_cls = None
    boxes_conf = None
    if getattr(r, 'boxes', None) is not None:
      try:
        boxes_xyxy = r.boxes.xyxy.cpu().numpy().tolist()
        boxes_cls = r.boxes.cls.cpu().numpy().tolist()
        boxes_conf = r.boxes.conf.cpu().numpy().tolist() if hasattr(r.boxes, 'conf') else None
      except Exception:
        try:
          boxes_xyxy = r.boxes.xyxy.numpy().tolist()
        except Exception:
          boxes_xyxy = None
    masks_present = getattr(r, 'masks', None) is not None
    raw_debug = {'boxes_xyxy': boxes_xyxy, 'boxes_cls': boxes_cls, 'boxes_conf': boxes_conf, 'masks_present': masks_present}
  except Exception as e:
    raw_debug = {'error': str(e)}

  # Normalize incoming debug flag (accept 'true'|'1'|'on')
  debug_flag = False
  try:
    debug_flag = str(debug).lower() in ('1','true','on')
  except Exception:
    debug_flag = False

  # log debug for server-side inspection
  if debug_flag:
    try:
      print('DEBUG /crop raw_debug keys:', list(raw_debug.keys()) if isinstance(raw_debug, dict) else raw_debug)
    except Exception as e:
      print('DEBUG log failed:', e)

  # Summary log of inference (always helpful for diagnostics)
  try:
    num_boxes = len(raw_debug.get('boxes_xyxy') or []) if isinstance(raw_debug, dict) else 0
    masks_present = raw_debug.get('masks_present') if isinstance(raw_debug, dict) else None
    print(f"INFO /crop inference summary: num_boxes={num_boxes}, masks_present={masks_present}")
  except Exception as e:
    print('INFO /crop inference summary failed:', e)

  mask = None
  boxes = getattr(r,'boxes', None)
  masks = getattr(r,'masks', None)
  candidates = []

  # collect candidate detections that match our targets
  if boxes is not None and hasattr(boxes,'cls'):
    cls_list = boxes.cls.tolist()
    confs = boxes.conf.tolist() if hasattr(boxes,'conf') else [1.0]*len(cls_list)
    for i,cls in enumerate(cls_list):
      name = name_map.get(int(cls))
      conf = float(confs[i])
      nlower = name.lower() if isinstance(name, str) else name
      # If no name filter configured, accept all detected classes as candidates
      if (not apply_name_filter) or nlower in targets or nlower in prompt_phrases:
        area = 0
        m_arr = None
        if masks is not None:
          try:
            m_arr = r.masks.data[i].cpu().numpy().astype(np.uint8)
          except:
            m_arr = (r.masks[i].numpy()*255).astype(np.uint8)
          cnts,_ = cv2.findContours(m_arr, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
          if cnts:
            area = max(cv2.contourArea(c) for c in cnts)
        else:
          xy = boxes.xyxy[i].cpu().numpy().astype(int)
          x1,y1,x2,y2 = xy
          area = max(0, (x2-x1)*(y2-y1))
        candidates.append({'i':i,'name':name,'conf':conf,'area':area,'mask':m_arr,'box': None if m_arr is not None else (x1,y1,x2,y2)})

  # Debug: cuantos candidatos se encontraron
  try:
    print(f"INFO /crop candidates found: {len(candidates)}")
    print(f"INFO /crop apply_name_filter={apply_name_filter} targets_sample={list(targets)[:5]} prompt_phrases_sample={list(prompt_phrases)[:5]}")
  except Exception as e:
    print('INFO /crop candidates log failed:', e)

  # Prioritize invoices and receipts with stricter confidence
  chosen = None
  prioritized = [c for c in candidates if c['name'] in ('invoice','receipt') and c['conf']>=0.4]
  if prioritized:
    chosen = max(prioritized, key=lambda c:c['area'])
  else:
    strong = [c for c in candidates if c['conf']>=0.4]
    if strong:
      chosen = max(strong, key=lambda c:c['area'])
    else:
      fallback = [c for c in candidates if c['conf']>=0.3]
      if fallback:
        chosen = max(fallback, key=lambda c:c['area'])

  if chosen is None:
    # No confident document detected among targets
    t_elapsed = round((time.time() - t_start) * 1000)
    try:
      print(f"INFO /crop result: no_target_detected (elapsed_ms={t_elapsed})")
    except Exception:
      pass
    h,w = img.shape[:2]
    return {'ok':False,'error':'no_target_detected', 'debug': raw_debug if debug_flag else None, 'image_meta': {'original': {'w': w, 'h': h}}, 'received_orig': {'len': orig_len, 'md5': orig_md5}}

  # If detection has no mask, return bbox crop as a fallback
  if chosen['mask'] is None and chosen['box'] is not None:
    x1,y1,x2,y2 = chosen['box']
    # Map coords from predict image space back to padded/original image space
    try:
      # If we scaled before predict, reverse scale
      if 'scale_to_predict' in locals() and scale_to_predict != 1.0:
        inv_scale = 1.0 / scale_to_predict
        x1 = int(round(x1 * inv_scale)); x2 = int(round(x2 * inv_scale)); y1 = int(round(y1 * inv_scale)); y2 = int(round(y2 * inv_scale))
      # If padding was applied, remove left offset
      if 'pad_left' in locals() and pad_left:
        x1 = x1 - pad_left; x2 = x2 - pad_left
      # Clamp to original image bounds
      x1 = max(0, min(x1, img.shape[1]-1)); x2 = max(0, min(x2, img.shape[1]));
      y1 = max(0, min(y1, img.shape[0]-1)); y2 = max(0, min(y2, img.shape[0]));
    except Exception:
      pass

    # Fallback crop on original image coordinates
    crop = img[y1:y2, x1:x2]
    _,buf=cv2.imencode('.jpg', crop)
    try:
      print(f"INFO /crop returning bbox crop (mapped to orig): box=({x1},{y1},{x2},{y2}), bytes={len(buf)}")
    except Exception:
      pass
    # Expand bbox to 4-point polygon (tl,tr,br,bl) to keep contract consistent
    src_coords = [[int(x1),int(y1)],[int(x2),int(y1)],[int(x2),int(y2)],[int(x1),int(y2)]]
    h,w = img.shape[:2]
    return {'ok':True,'image_b64':base64.b64encode(buf).decode(),'src_coords':src_coords,'detected_class':chosen['name'], 'debug': raw_debug if debug_flag else None, 'image_meta': {'original': {'w': w, 'h': h}, 'warped': {'w': x2-x1, 'h': y2-y1}}, 'received_orig': {'len': orig_len, 'md5': orig_md5}}

  # otherwise use the chosen mask
  mask = chosen['mask']
  if mask is None: return {'ok':False,'error':'no_segmentation_found'}

  # CRITICAL: Scale mask to padded image dimensions (YOLO returns mask at model resolution), then crop to original image region if padding was applied
  h_orig, w_orig = img.shape[:2]
  # padded_img, padded_h/padded_w and pad_left may have been set earlier
  try:
    padded_h
  except NameError:
    padded_h, padded_w = h_orig, w_orig
    pad_left = 0
  h_mask, w_mask = mask.shape[:2]
  # Resize mask to padded dimensions first
  if (h_mask, w_mask) != (padded_h, padded_w):
    mask = cv2.resize(mask, (padded_w, padded_h), interpolation=cv2.INTER_NEAREST)
    try:
      print(f"INFO /crop resized mask from {w_mask}x{h_mask} to padded {padded_w}x{padded_h}")
    except Exception:
      pass
  # If we padded horizontally, crop mask back to original image width
  if padded_w != w_orig:
    try:
      mask = mask[:, pad_left:pad_left + w_orig]
      print(f"INFO /crop cropped mask to original region with pad_left={pad_left}, result={mask.shape}")
    except Exception:
      pass
  # Ensure final mask matches original image dims
  h_mask2, w_mask2 = mask.shape[:2]
  if (h_mask2, w_mask2) != (h_orig, w_orig):
    try:
      mask = cv2.resize(mask, (w_orig, h_orig), interpolation=cv2.INTER_NEAREST)
      print(f"INFO /crop final resized mask to original {w_orig}x{h_orig}")
    except Exception:
      pass

  # Add richer debug info so caller can inspect padding/scale/mask and contour details
  try:
    debug_extras = {
      'pad_left': int(pad_left) if 'pad_left' in locals() else 0,
      'padded_size': {'w': int(padded_w), 'h': int(padded_h)},
      'predict_scale': float(scale_to_predict) if 'scale_to_predict' in locals() else 1.0,
      'predict_size': {'w': int(predict_img.shape[1]), 'h': int(predict_img.shape[0])} if 'predict_img' in locals() else None,
      'mask_original_shape': {'w': int(w_mask), 'h': int(h_mask)},
      'mask_final_shape': {'w': int(mask.shape[1]), 'h': int(mask.shape[0])}
    }
    raw_debug = raw_debug or {}
    raw_debug.update({'pipeline': debug_extras})
  except Exception as e:
    print('DEBUG extras failed', e)
  
  cnts,_ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
  cnt = max(cnts, key=cv2.contourArea)
  try:
    print(f"INFO /crop contour area={cv2.contourArea(cnt)}, points={len(cnt)}")
  except Exception:
    pass
  eps = 0.01*cv2.arcLength(cnt, True); approx = cv2.approxPolyDP(cnt, eps, True)
  try:
    print(f"INFO /crop approx polygon: {len(approx)} vertices (target=4)")
  except Exception:
    pass
  if len(approx)==4:
    pts = approx.reshape(4,2).astype('float32')
  else:
    rect = cv2.minAreaRect(cnt); pts = cv2.boxPoints(rect).astype('float32')
  try:
    print(f"INFO /crop raw points before ordering: {pts.tolist()}")
  except Exception:
    pass
  src = _order_pts(pts); (tl,tr,br,bl)=src
  try:
    print(f"INFO /crop ordered points: tl={tl.tolist()}, tr={tr.tolist()}, br={br.tolist()}, bl={bl.tolist()}")
  except Exception:
    pass

  # Compute contour bbox for extra diagnostics
  try:
    x_coords = src[:,0]
    y_coords = src[:,1]
    contour_bbox = {'min_x': int(x_coords.min()), 'max_x': int(x_coords.max()), 'min_y': int(y_coords.min()), 'max_y': int(y_coords.max())}
    raw_debug = raw_debug or {}
    raw_debug.update({'contour_bbox': contour_bbox})
  except Exception:
    pass

  wA = np.linalg.norm(br-bl); wB = np.linalg.norm(tr-tl); maxW = max(int(wA), int(wB))
  hA = np.linalg.norm(tr-br); hB = np.linalg.norm(tl-bl); maxH = max(int(hA), int(hB))
  dst = np.array([[0,0],[maxW-1,0],[maxW-1,maxH-1],[0,maxH-1]], dtype='float32')
  M = cv2.getPerspectiveTransform(src, dst); warped = cv2.warpPerspective(img, M, (maxW, maxH))
  # --- INSERCIÓN AQUÍ ---
  warped = enhance_document(warped)
  # ----------------------
  _,buf = cv2.imencode('.jpg', warped)
  try:
    t_elapsed = round((time.time() - t_start) * 1000)
    print(f"INFO /crop returning warped image: warped_size={maxW}x{maxH}, src_coords={src.tolist()}, elapsed_ms={t_elapsed}")
  except Exception:
    pass
  h,w = img.shape[:2]
  return {
    'ok':True,
    'image_b64':base64.b64encode(buf).decode(),
    'src_coords':src.tolist(),
    'detected_class': chosen['name'] if 'chosen' in locals() and chosen else None,
    'debug': raw_debug if debug_flag else None,
    'image_meta': {'original': {'w': w, 'h': h}, 'warped': {'w': maxW, 'h': maxH}},
    'received_orig': {'len': orig_len, 'md5': orig_md5},
  }

@router.post('/warp')
@audit('warp')
async def warp(file: UploadFile = File(...), points: str = Form(None), orig_len: str = Form(None), orig_md5: str = Form(None)):
  # points is expected as JSON string list of 4 points [[x,y],...]
  data = await file.read(); arr = np.frombuffer(data, np.uint8); img = cv2.imdecode(arr, cv2.IMREAD_COLOR)
  try:
    print(f"INFO /warp received file bytes={len(data)} img_shape={tuple(img.shape) if img is not None else None} points_param={str(points)[:200]} orig_len={orig_len} orig_md5={orig_md5}")
  except Exception:
    pass
  if not points:
    return {'ok':False,'error':'points_required'}
  try:
    pts = np.array(json.loads(points), dtype='float32')
    print(f"INFO /warp parsed points: {pts.tolist()}")
  except Exception as e:
    return {'ok':False,'error':'invalid_points_format'}

  # If coordinates appear normalized (<=1), convert to image pixels
  h,w = img.shape[:2]
  if np.all(pts <= 1.0):
    pts_px = np.stack([pts[:,0]*w, pts[:,1]*h], axis=1)
  else:
    pts_px = pts

  src = _order_pts(pts_px)
  (tl,tr,br,bl) = src
  wA = np.linalg.norm(br-bl); wB = np.linalg.norm(tr-tl); maxW = max(int(wA), int(wB))
  hA = np.linalg.norm(tr-br); hB = np.linalg.norm(tl-bl); maxH = max(int(hA), int(hB))
  dst = np.array([[0,0],[maxW-1,0],[maxW-1,maxH-1],[0,maxH-1]], dtype='float32')
  M = cv2.getPerspectiveTransform(src, dst)
  warped = cv2.warpPerspective(img, M, (maxW, maxH))
  _,buf = cv2.imencode('.jpg', warped)
  try:
    print(f"INFO /warp encoded image bytes={len(buf)}")
  except Exception:
    pass
  b64 = base64.b64encode(buf).decode()
  # Return both 'image' and 'image_b64' for compatibility with frontend proxy
  return {'ok':True,'image': b64, 'image_b64': b64, 'image_len': len(buf), 'src_coords': src.tolist()}
