from fastapi import APIRouter, UploadFile, File, Form
import numpy as np, cv2, base64, asyncio, json, time
from state import state
from audit import audit

router = APIRouter()

def _order_pts(pts):
  s = pts.sum(axis=1); diff = np.diff(pts, axis=1)
  tl = pts[np.argmin(s)]; br = pts[np.argmax(s)]; tr = pts[np.argmin(diff)]; bl = pts[np.argmax(diff)];
  return np.array([tl,tr,br,bl], dtype='float32')

@router.post('/crop')
@audit('crop')
async def crop(file: UploadFile = File(...), debug: str = Form(None)):
  data = await file.read(); arr = np.frombuffer(data, np.uint8); img = cv2.imdecode(arr, cv2.IMREAD_COLOR)
  # Log arrival
  try:
    print(f"INFO /crop received file: {getattr(file, 'filename', getattr(file, 'filename', None))} bytes={len(data)} img_shape={tuple(img.shape) if img is not None else None}")
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
  predict_kwargs = {'source':img, 'imgsz':1024, 'conf':0.3}
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
    return {'ok':False,'error':'no_target_detected', 'debug': raw_debug if debug_flag else None, 'image_meta': {'original': {'w': w, 'h': h}}}

  # If detection has no mask, return bbox crop as a fallback
  if chosen['mask'] is None and chosen['box'] is not None:
    x1,y1,x2,y2 = chosen['box']
    crop = img[y1:y2,x1:x2]; _,buf=cv2.imencode('.jpg', crop)
    try:
      print(f"INFO /crop returning bbox crop: box=({x1},{y1},{x2},{y2}), bytes={len(buf)}")
    except Exception:
      pass
    # Expand bbox to 4-point polygon (tl,tr,br,bl) to keep contract consistent
    src_coords = [[int(x1),int(y1)],[int(x2),int(y1)],[int(x2),int(y2)],[int(x1),int(y2)]]
    h,w = img.shape[:2]
    return {'ok':True,'image_b64':base64.b64encode(buf).decode(),'src_coords':src_coords,'detected_class':chosen['name'], 'debug': raw_debug if debug_flag else None, 'image_meta': {'original': {'w': w, 'h': h}, 'warped': {'w': x2-x1, 'h': y2-y1}}}

  # otherwise use the chosen mask
  mask = chosen['mask']
  if mask is None: return {'ok':False,'error':'no_segmentation_found'}
  cnts,_ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
  cnt = max(cnts, key=cv2.contourArea)
  eps = 0.02*cv2.arcLength(cnt, True); approx = cv2.approxPolyDP(cnt, eps, True)
  if len(approx)==4:
    pts = approx.reshape(4,2).astype('float32')
  else:
    rect = cv2.minAreaRect(cnt); pts = cv2.boxPoints(rect).astype('float32')
  src = _order_pts(pts); (tl,tr,br,bl)=src
  wA = np.linalg.norm(br-bl); wB = np.linalg.norm(tr-tl); maxW = max(int(wA), int(wB))
  hA = np.linalg.norm(tr-br); hB = np.linalg.norm(tl-bl); maxH = max(int(hA), int(hB))
  dst = np.array([[0,0],[maxW-1,0],[maxW-1,maxH-1],[0,maxH-1]], dtype='float32')
  M = cv2.getPerspectiveTransform(src, dst); warped = cv2.warpPerspective(img, M, (maxW, maxH))
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
  }

@router.post('/warp')
@audit('warp')
async def warp(file: UploadFile = File(...), points: str = Form(None)):
  # points is expected as JSON string list of 4 points [[x,y],...]
  data = await file.read(); arr = np.frombuffer(data, np.uint8); img = cv2.imdecode(arr, cv2.IMREAD_COLOR)
  try:
    print(f"INFO /warp received file bytes={len(data)} img_shape={tuple(img.shape) if img is not None else None} points_param={str(points)[:200]}")
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
