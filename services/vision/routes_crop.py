from fastapi import APIRouter, UploadFile, File, Form
import numpy as np, cv2, base64, asyncio, json
from state import state
from audit import audit

router = APIRouter()

def _order_pts(pts):
  s = pts.sum(axis=1); diff = np.diff(pts, axis=1)
  tl = pts[np.argmin(s)]; br = pts[np.argmax(s)]; tr = pts[np.argmin(diff)]; bl = pts[np.argmax(diff)];
  return np.array([tl,tr,br,bl], dtype='float32')

@router.post('/crop')
@audit('crop')
async def crop(file: UploadFile = File(...), debug: bool = Form(False)):
  data = await file.read(); arr = np.frombuffer(data, np.uint8); img = cv2.imdecode(arr, cv2.IMREAD_COLOR)
  model = state.get('yolo',{}).get('_model')
  if not model: return {'ok':False,'error':'yolo_not_ready'}
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
  target_idxs = [i for i,n in name_map_lower.items() if n in targets or n in prompt_phrases]
  predict_kwargs = {'source':img, 'imgsz':1024, 'conf':0.3}
  if target_idxs:
    predict_kwargs['classes'] = target_idxs
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
      if nlower in targets or nlower in prompt_phrases:
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
    return {'ok':False,'error':'no_target_detected', 'debug': raw_debug if debug else None}

  # If detection has no mask, return bbox crop as a fallback
  if chosen['mask'] is None and chosen['box'] is not None:
    x1,y1,x2,y2 = chosen['box']
    crop = img[y1:y2,x1:x2]; _,buf=cv2.imencode('.jpg', crop)
    return {'ok':True,'image_b64':base64.b64encode(buf).decode(),'src_coords':[[int(x1),int(y1)],[int(x2),int(y2)]],'detected_class':chosen['name'], 'debug': raw_debug if debug else None}

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
  return {'ok':True,'image_b64':base64.b64encode(buf).decode(),'src_coords':src.tolist(),'detected_class': chosen['name'] if 'chosen' in locals() and chosen else None, 'debug': raw_debug if debug else None}

@router.post('/warp')
@audit('warp')
async def warp(file: UploadFile = File(...), points: str = Form(None)):
  # points is expected as JSON string list of 4 points [[x,y],...]
  data = await file.read(); arr = np.frombuffer(data, np.uint8); img = cv2.imdecode(arr, cv2.IMREAD_COLOR)
  if not points:
    return {'ok':False,'error':'points_required'}
  try:
    pts = np.array(json.loads(points), dtype='float32')
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
  return {'ok':True,'image': base64.b64encode(buf).decode(), 'src_coords': src.tolist()}
