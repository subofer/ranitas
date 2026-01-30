"use client";
import React, { useRef, useState, useEffect, useCallback } from "react";
import SafeImage from "@/components/ui/SafeImage";
import OptimizedImage from "./components/OptimizedImage";

// Helper: solve 8x8 linear system via Gaussian elimination
function solveLinearSystem(A, b) {
  const n = A.length;
  const M = A.map((row, i) => [...row, b[i]]);

  for (let i = 0; i < n; i++) {
    // Pivot
    let maxRow = i;
    for (let k = i + 1; k < n; k++)
      if (Math.abs(M[k][i]) > Math.abs(M[maxRow][i])) maxRow = k;
    const tmp = M[i];
    M[i] = M[maxRow];
    M[maxRow] = tmp;

    // Normalize
    const coef = M[i][i];
    if (Math.abs(coef) < 1e-12) continue;
    for (let j = i; j <= n; j++) M[i][j] /= coef;

    // Eliminate
    for (let k = 0; k < n; k++)
      if (k !== i) {
        const factor = M[k][i];
        for (let j = i; j <= n; j++) M[k][j] -= factor * M[i][j];
      }
  }
  return M.map((row) => row[n]);
}

// Compute homography from src quad to dst rect
function computeHomography(src, dst) {
  // src and dst are arrays of 4 points {x,y}
  // Solve for h (8 unknowns) using linear equations
  const A = [];
  const b = [];
  for (let i = 0; i < 4; i++) {
    const { x: x1, y: y1 } = src[i];
    const { x: x2, y: y2 } = dst[i];
    A.push([x1, y1, 1, 0, 0, 0, -x2 * x1, -x2 * y1]);
    b.push(x2);
    A.push([0, 0, 0, x1, y1, 1, -y2 * x1, -y2 * y1]);
    b.push(y2);
  }
  const h = solveLinearSystem(A, b);
  h.push(1);
  return h; // 9 elements
}

function invertHomography(H) {
  // Invert 3x3 matrix H
  const a = H;
  const m = [
    [a[0], a[1], a[2]],
    [a[3], a[4], a[5]],
    [a[6], a[7], a[8]],
  ];
  const det =
    m[0][0] * m[1][1] * m[2][2] +
    m[0][1] * m[1][2] * m[2][0] +
    m[0][2] * m[1][0] * m[2][1] -
    (m[0][2] * m[1][1] * m[2][0] +
      m[0][1] * m[1][0] * m[2][2] +
      m[0][0] * m[1][2] * m[2][1]);
  if (Math.abs(det) < 1e-12) return null;
  const inv = [];
  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 3; j++) {
      const cofactor =
        m[(j + 1) % 3][(i + 1) % 3] * m[(j + 2) % 3][(i + 2) % 3] -
        m[(j + 1) % 3][(i + 2) % 3] * m[(j + 2) % 3][(i + 1) % 3];
      inv.push(cofactor / det);
    }
  }
  return inv;
}

function bilinearSample(srcData, sx, sy, width, height) {
  const x = Math.floor(sx);
  const y = Math.floor(sy);
  const dx = sx - x;
  const dy = sy - y;
  const get = (xx, yy) => {
    if (xx < 0 || yy < 0 || xx >= width || yy >= height) return [0, 0, 0, 0];
    const idx = (yy * width + xx) * 4;
    return [srcData[idx], srcData[idx + 1], srcData[idx + 2], srcData[idx + 3]];
  };
  const c00 = get(x, y);
  const c10 = get(x + 1, y);
  const c01 = get(x, y + 1);
  const c11 = get(x + 1, y + 1);
  const res = [0, 0, 0, 0];
  for (let i = 0; i < 4; i++) {
    const v =
      c00[i] * (1 - dx) * (1 - dy) +
      c10[i] * dx * (1 - dy) +
      c01[i] * (1 - dx) * dy +
      c11[i] * dx * dy;
    res[i] = v;
  }
  return res;
}

function ManualVertexCropper(
  {
    src,
    onCrop,
    onCancel,
    zoom = 1,
    pan = { x: 0, y: 0 },
    setZoom = null,
    setPan = null,
    onPanStart = null,
    onPanMove = null,
    onPanEnd = null,
    onWheel = null,
    carouselItems = [],
    carouselIndex = 0,
    onCarouselPrev = null,
    onCarouselNext = null,
    hostImageRef = null,
    overlayOnly = false,
    isPanning = false,
    setIsPanning = null,
    panStart = { x: 0, y: 0 },
    setPanStart = null,
  },
  ref,
) {
  const canvasRef = useRef(null);
  const previewCanvasRef = useRef(null);
  // Overlay container refs
  const leftContainerRef = useRef(null);
  const previewOverlayRef = useRef(null);
  // New: separate canvases for side-by-side comparison
  const origPreviewRef = useRef(null);
  const enhancedPreviewRef = useRef(null);
  // Offscreen canvases (store full-resolution crop images here)
  const offscreenOrigRef = useRef(null);
  const offscreenEnhRef = useRef(null);

  // View transform refs for synchronized zoom/pan
  const viewScaleRef = useRef(1);
  const viewTxRef = useRef(0);
  const viewTyRef = useRef(0);
  const [viewScale, setViewScale] = useState(1); // mirrored for UI display
  const isPanningRef = useRef(false);
  const lastPointerRef = useRef({ x: 0, y: 0 });

  const imgRef = useRef(null);
  const detectControllerRef = useRef(null);
  // For drawing a box by dragging (start point + drag to size)
  const rectStartRef = useRef(null);

  // Body overflow helper for granular scroll locking (only while dragging)
  const bodyPrevOverflowRef = useRef(null);
  const lockBodyScroll = () => {
    try {
      if (bodyPrevOverflowRef.current === null)
        bodyPrevOverflowRef.current = document.body.style.overflow;
      document.body.style.overflow = "hidden";
    } catch (e) {}
  };
  const unlockBodyScroll = () => {
    try {
      if (bodyPrevOverflowRef.current !== null) {
        document.body.style.overflow = bodyPrevOverflowRef.current;
        bodyPrevOverflowRef.current = null;
      }
    } catch (e) {}
  };

  const clampToCanvas = (pt) => {
    const canvas = canvasRef.current;
    if (!canvas) return pt;
    const x = Math.max(0, Math.min(pt.x, canvas.width));
    const y = Math.max(0, Math.min(pt.y, canvas.height));
    return { x, y };
  };

  // Client-side debug trace for mouse/pointer events (can be exported to server)
  const debugTraceRef = useRef([]);
  // Mirror important state in refs to avoid TDZ and make pushTrace stable
  const pointsRef = useRef([]);
  const dragIndexRef = useRef(null);

  const pushTrace = useCallback((ev) => {
    try {
      const canvas = canvasRef.current;
      debugTraceRef.current.push({
        t: Date.now(),
        type: ev && ev.type ? ev.type : "custom",
        clientX: ev?.clientX || null,
        clientY: ev?.clientY || null,
        canvasW: canvas ? canvas.width : null,
        canvasH: canvas ? canvas.height : null,
        points: JSON.parse(JSON.stringify(pointsRef.current)),
        dragIndex: dragIndexRef.current,
      });
      // keep trace short
      if (debugTraceRef.current.length > 2000) debugTraceRef.current.shift();
    } catch (e) {
      console.warn("pushTrace failed", e);
    }
  }, []);
  const drawingRectRef = useRef(false);
  // When we finish drawing a rect, the browser may emit a click event — suppress the next click
  const justDrawnRectRef = useRef(false);

  const [points, setPoints] = useState([]); // up to 4 [{x,y}]
  const [dragIndex, setDragIndex] = useState(null);
  useEffect(() => {
    pointsRef.current = points;
  }, [points]);
  useEffect(() => {
    dragIndexRef.current = dragIndex;
  }, [dragIndex]);
  const [hoveredIndex, setHoveredIndex] = useState(null);
  const [previewGenerated, setPreviewGenerated] = useState(false);
  const previewGeneratedRef = useRef(false);
  const markPreviewGenerated = (v) => {
    // Update ref immediately so synchronous logic can rely on it
    previewGeneratedRef.current = !!v;
    try {
      if (typeof setPreviewGenerated === "function") setPreviewGenerated(!!v);
      else
        console.warn(
          "markPreviewGenerated: setPreviewGenerated is not a function",
        );
    } catch (e) {
      console.warn(
        "markPreviewGenerated: failed to call setPreviewGenerated",
        e,
      );
    }
  };
  const [detectando, setDetectando] = useState(false);
  const [errorDeteccion, setErrorDeteccion] = useState(null);
  // Enhanced image (restored) stored transiently when user runs 'Mejorar'
  const [enhancedFile, setEnhancedFile] = useState(null);
  const [enhancedPreview, setEnhancedPreview] = useState(null);
  const [debugInfo, setDebugInfo] = useState(null);
  const [yoloStatus, setYoloStatus] = useState(null);
  const tempDetectWidthRef = useRef(null);

  // Cropped image preview for carousel
  const [croppedPreview, setCroppedPreview] = useState(null);
  const [originalPreview, setOriginalPreview] = useState(null);

  // Restore / enhancement status and logs
  const [restoreStatus, setRestoreStatus] = useState(null);
  const [restoreEvents, setRestoreEvents] = useState([]);
  const [processingPreview, setProcessingPreview] = useState(false);
  const pushRestoreEvent = useCallback((msg) => {
    setRestoreEvents((prev) => [{ ts: Date.now(), msg }, ...prev].slice(0, 10));
    setRestoreStatus(msg);
  }, []);

  // Modal top position to place the modal below the IA header
  const [modalTop, setModalTop] = useState(48);
  useEffect(() => {
    // Fixed modal top so it always opens at the same position regardless of scroll
    setModalTop(64);

    // Fetch YOLO service status for enabling/disabling enhancement
    const fetchStatus = async () => {
      try {
        const res = await fetch(`${VISION_SERVICE_URL}/status`);
        if (!res.ok) {
          const d = await res.json().catch(() => null);
          setYoloStatus(d || { ok: false, error: "No response" });
        } else {
          const d = await res.json();
          setYoloStatus(d);

          // If DocRes model exists but not yet loaded, warm it up in background
          try {
            if (
              d.docres_model_path &&
              d.docres_model_exists &&
              !d.docres_loaded
            ) {
              pushRestoreEvent("Pre-warming DocRes model...");
              fetch(`${VISION_SERVICE_URL}/warmup`, { method: "POST" })
                .then((r) => r.json().catch(() => null))
                .then((js) => {
                  if (js && js.ok)
                    pushRestoreEvent("DocRes warmed: " + js.timing_ms + "ms");
                  else pushRestoreEvent("DocRes warmup failed");
                })
                .catch((e) => pushRestoreEvent("DocRes warmup error"));
            }
          } catch (e) {
            // ignore warmup failures
          }
        }
      } catch (e) {
        setYoloStatus({ ok: false, error: String(e) });
      }
    };
    fetchStatus();

    // Keep reference to previous body overflow but do not block scroll by default.
    // We'll only lock the body scroll while the user is actively dragging (lockBodyScroll/unlockBodyScroll).
    bodyPrevOverflowRef.current = document.body.style.overflow;

    return () => {
      // Ensure we restore any changed overflow when component unmounts
      if (bodyPrevOverflowRef.current !== null) {
        document.body.style.overflow = bodyPrevOverflowRef.current;
        bodyPrevOverflowRef.current = null;
      }
    };
  }, [pushRestoreEvent]);

  // Abort any pending detection when the component unmounts
  useEffect(() => {
    return () => {
      try {
        detectControllerRef.current?.abort();
      } catch (e) {}
    };
  }, []);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d", { willReadFrequently: false });
    const img = imgRef.current;
    if (!canvas || !ctx || !img) return;

    if (
      canvas.width === 0 ||
      canvas.height === 0 ||
      img.width === 0 ||
      img.height === 0
    ) {
      pushTrace({
        type: "draw-skipped",
        canvasW: canvas.width,
        canvasH: canvas.height,
        imgW: img.width,
        imgH: img.height,
      });
      console.warn(
        "draw skipped due to zero-size canvas/image",
        canvas.width,
        canvas.height,
        img.width,
        img.height,
      );
      return;
    }

    // Optimización: usar requestAnimationFrame solo si es necesario
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

    // draw polygon if points
    if (points.length > 0) {
      // Oscurecer todo (más suave)
      ctx.fillStyle = "rgba(0,0,0,0.3)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Aclarar área seleccionada
      ctx.save();
      ctx.globalCompositeOperation = "destination-out";
      ctx.beginPath();
      ctx.moveTo(points[0].x, points[0].y);
      for (let i = 1; i < points.length; i++)
        ctx.lineTo(points[i].x, points[i].y);
      if (points.length === 4) ctx.closePath();
      ctx.fill();
      ctx.restore();

      // Si tenemos 4 puntos, ordenarlos para mostrar el polígono correcto
      let orderedPoints = [...points];
      if (points.length === 4) {
        // Ordenar por Y
        orderedPoints.sort((a, b) => a.y - b.y);
        const topPoints = orderedPoints.slice(0, 2).sort((a, b) => a.x - b.x);
        const bottomPoints = orderedPoints
          .slice(2, 4)
          .sort((a, b) => a.x - b.x);
        orderedPoints = [
          topPoints[0],
          topPoints[1],
          bottomPoints[1],
          bottomPoints[0],
        ]; // TL, TR, BR, BL para polígono cerrado
      }

      // draw lines con polígono ordenado
      ctx.strokeStyle = "#3b82f6";
      ctx.lineWidth = 2;
      ctx.shadowColor = "#3b82f6";
      ctx.shadowBlur = 4;
      ctx.beginPath();
      ctx.moveTo(orderedPoints[0].x, orderedPoints[0].y);
      for (let i = 1; i < orderedPoints.length; i++)
        ctx.lineTo(orderedPoints[i].x, orderedPoints[i].y);
      if (orderedPoints.length === 4) ctx.closePath();
      ctx.stroke();
      ctx.shadowBlur = 0;

      // draw points originales con sus números
      for (let i = 0; i < points.length; i++) {
        const pt = points[i];
        const isHovered = hoveredIndex === i || dragIndex === i;
        const radius = isHovered ? 18 : 12;

        // Círculo blanco
        ctx.fillStyle = "#fff";
        ctx.strokeStyle = isHovered ? "#ef4444" : "#2563eb";
        ctx.lineWidth = isHovered ? 5 : 3;
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Número
        ctx.fillStyle = isHovered ? "#ef4444" : "#2563eb";
        ctx.font = isHovered ? "bold 14px sans-serif" : "12px sans-serif";
        const text = String(i + 1);
        const metrics = ctx.measureText(text);
        ctx.fillText(text, pt.x - metrics.width / 2, pt.y + 5);
      }
    }
  }, [points, hoveredIndex, dragIndex, pushTrace]);

  useEffect(() => {
    const img = new Image();
    img.src = src;
    img.onload = () => {
      imgRef.current = img;

      // Crear preview de la imagen original completa
      const tempCanvas = document.createElement("canvas");
      tempCanvas.width = img.width;
      tempCanvas.height = img.height;
      const ctx = tempCanvas.getContext("2d");
      ctx.drawImage(img, 0, 0);
      tempCanvas.toBlob((blob) => {
        const url = URL.createObjectURL(blob);
        setOriginalPreview(url);
      });

      const canvas = canvasRef.current;
      const maxW = Math.min(window.innerWidth - 120, img.width);
      const scale = Math.min(maxW / img.width, 1);
      canvas.width = img.width * scale;
      canvas.height = img.height * scale;
      canvas.dataset.scale = scale;
      draw();
    };
  }, [src, draw]);

  // Update canvas scale when zoom changes
  useEffect(() => {
    const canvas = canvasRef.current;
    const img = imgRef.current;
    if (canvas && img) {
      const baseScale = canvas.width / img.width;
      canvas.dataset.scale = baseScale * zoom;
    }
  }, [zoom]);

  useEffect(() => draw(), [points, draw, hoveredIndex, dragIndex, zoom]);

  // Generar preview cuando tenemos 4 puntos
  const generatePreview = useCallback(() => {
    if (points.length !== 4) return;

    const canvas = canvasRef.current;
    const img = imgRef.current;
    const scale = canvas.dataset.scale ? Number(canvas.dataset.scale) : 1;

    // Convert canvas points back to original image coords
    let srcPts = points.map((p) => ({ x: p.x / scale, y: p.y / scale }));

    // ORDENAR PUNTOS: Top-Left, Top-Right, Bottom-Left, Bottom-Right
    // 1. Ordenar por Y (arriba primero)
    srcPts.sort((a, b) => a.y - b.y);

    // 2. Los 2 primeros son top, los 2 últimos son bottom
    const topPoints = srcPts.slice(0, 2).sort((a, b) => a.x - b.x); // Ordenar por X
    const bottomPoints = srcPts.slice(2, 4).sort((a, b) => a.x - b.x);

    // 3. Asignar en orden: TL, TR, BL, BR
    srcPts = [
      topPoints[0], // Top-Left
      topPoints[1], // Top-Right
      bottomPoints[0], // Bottom-Left
      bottomPoints[1], // Bottom-Right
    ];

    // Destination rectangle size
    const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
    const top = dist(srcPts[0], srcPts[1]);
    const bottom = dist(srcPts[2], srcPts[3]);
    const left = dist(srcPts[0], srcPts[2]);
    const right = dist(srcPts[1], srcPts[3]);
    const dstW = Math.round((top + bottom) / 2);
    const dstH = Math.round((left + right) / 2);

    // Destination rectangle points (ordenados: TL, TR, BL, BR)
    const dstPts = [
      { x: 0, y: 0 },
      { x: dstW - 1, y: 0 },
      { x: 0, y: dstH - 1 },
      { x: dstW - 1, y: dstH - 1 },
    ];

    const H = computeHomography(srcPts, dstPts);
    const invH = invertHomography(H);
    if (!invH) return;

    // Create source imageData
    const tmpCanvas = document.createElement("canvas");
    tmpCanvas.width = img.width;
    tmpCanvas.height = img.height;
    const tctx = tmpCanvas.getContext("2d", { willReadFrequently: true });
    tctx.drawImage(img, 0, 0);
    const srcData = tctx.getImageData(0, 0, tmpCanvas.width, tmpCanvas.height);

    // Create dest canvas for preview (original crop)
    const prevCanvas = origPreviewRef.current || previewCanvasRef.current;
    if (!prevCanvas) return;
    prevCanvas.width = dstW;
    prevCanvas.height = dstH;
    const dctx = prevCanvas.getContext("2d", { willReadFrequently: false });
    const dstImage = dctx.createImageData(dstW, dstH);

    // For each pixel in dst, map back to src via inverse homography
    const inv = invH;
    for (let y = 0; y < dstH; y++) {
      for (let x = 0; x < dstW; x++) {
        const denom = inv[6] * x + inv[7] * y + inv[8];
        const sx = (inv[0] * x + inv[1] * y + inv[2]) / denom;
        const sy = (inv[3] * x + inv[4] * y + inv[5]) / denom;

        const color = bilinearSample(
          srcData.data,
          sx,
          sy,
          tmpCanvas.width,
          tmpCanvas.height,
        );
        const idx = (y * dstW + x) * 4;
        dstImage.data[idx] = color[0];
        dstImage.data[idx + 1] = color[1];
        dstImage.data[idx + 2] = color[2];
        dstImage.data[idx + 3] = color[3];
      }
    }

    dctx.putImageData(dstImage, 0, 0);

    // Create/store offscreen original canvas (full-resolution crop) and then render view
    const off = document.createElement("canvas");
    off.width = dstW;
    off.height = dstH;
    const offCtx = off.getContext("2d");
    offCtx.putImageData(dstImage, 0, 0);
    offscreenOrigRef.current = off;

    // Crear blob URL para la imagen recortada
    off.toBlob((blob) => {
      if (croppedPreview) URL.revokeObjectURL(croppedPreview);
      const url = URL.createObjectURL(blob);
      setCroppedPreview(url);
    });

    // Ensure visible canvases have proper intrinsic size (match offscreen)
    const prevCanvasDom = origPreviewRef.current || previewCanvasRef.current;
    const enhCanvasDom = enhancedPreviewRef.current || previewCanvasRef.current;
    if (prevCanvasDom) {
      prevCanvasDom.width = dstW;
      prevCanvasDom.height = dstH;
      prevCanvasDom.style.maxHeight = "420px";
    }
    if (enhCanvasDom) {
      enhCanvasDom.width = dstW;
      enhCanvasDom.height = dstH;
      enhCanvasDom.style.maxHeight = "420px";
      // Clear enhanced canvas until an enhanced image arrives
      const ectx = enhCanvasDom.getContext("2d");
      ectx.clearRect(0, 0, dstW, dstH);
    }

    // Reset view transform to show full image and render
    viewScaleRef.current = 1;
    viewTxRef.current = 0;
    viewTyRef.current = 0;
    setViewScale(1);
    renderView();
  }, [points]);

  // Regenerar preview cuando se mueven los puntos (solo si está en modo comparación)
  useEffect(() => {
    if (points.length === 4 && previewGenerated) {
      const timeout = setTimeout(
        () => {
          generatePreview();
        },
        dragIndex !== null ? 150 : 100,
      ); // Más delay si estamos arrastrando
      return () => clearTimeout(timeout);
    }
  }, [points, previewGenerated, generatePreview, dragIndex]);

  // --- Synchronized view (zoom & pan) utilities ---
  const resetView = useCallback(() => {
    viewScaleRef.current = 1;
    viewTxRef.current = 0;
    viewTyRef.current = 0;
    setViewScale(1);
    renderView();
  }, []);

  function renderView() {
    // Draw the current view from offscreen canvases into visible canvases applying scale/translate
    const origCanvas = origPreviewRef.current;
    const enhCanvas = enhancedPreviewRef.current;
    const offOrig = offscreenOrigRef.current;
    const offEnh = offscreenEnhRef.current;
    const scale = viewScaleRef.current;
    const tx = viewTxRef.current;
    const ty = viewTyRef.current;

    if (origCanvas && offOrig) {
      const ctx = origCanvas.getContext("2d");
      ctx.save();
      ctx.clearRect(0, 0, origCanvas.width, origCanvas.height);
      ctx.setTransform(scale, 0, 0, scale, tx, ty);
      ctx.drawImage(offOrig, 0, 0);
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.restore();
    }
    if (enhCanvas && offEnh) {
      const ctx = enhCanvas.getContext("2d");
      ctx.save();
      ctx.clearRect(0, 0, enhCanvas.width, enhCanvas.height);
      ctx.setTransform(scale, 0, 0, scale, tx, ty);
      ctx.drawImage(offEnh, 0, 0);
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.restore();
    }
  }

  function handleWheel(e) {
    // Zoom at pointer position
    e.preventDefault();
    const rect = (
      origPreviewRef.current || previewCanvasRef.current
    )?.getBoundingClientRect();
    if (!rect) return;
    const px = e.clientX - rect.left;
    const py = e.clientY - rect.top;

    const prevScale = viewScaleRef.current;
    const factor = e.deltaY < 0 ? 1.12 : 0.88;
    const newScale = Math.max(0.2, Math.min(8, prevScale * factor));

    // image-space coords of pointer
    const ix = (px - viewTxRef.current) / prevScale;
    const iy = (py - viewTyRef.current) / prevScale;

    viewScaleRef.current = newScale;
    viewTxRef.current = px - ix * newScale;
    viewTyRef.current = py - iy * newScale;
    setViewScale(newScale);
    renderView();
  }

  function handlePointerDown(e) {
    isPanningRef.current = true;
    lastPointerRef.current = { x: e.clientX, y: e.clientY };
    try {
      e.target.setPointerCapture(e.pointerId);
    } catch (err) {}
  }
  function handlePointerMove(e) {
    if (!isPanningRef.current) return;
    e.preventDefault();
    const dx = e.clientX - lastPointerRef.current.x;
    const dy = e.clientY - lastPointerRef.current.y;
    lastPointerRef.current = { x: e.clientX, y: e.clientY };
    viewTxRef.current += dx;
    viewTyRef.current += dy;
    renderView();
  }
  function handlePointerUp(e) {
    isPanningRef.current = false;
    try {
      e.target.releasePointerCapture &&
        e.target.releasePointerCapture(e.pointerId);
    } catch (err) {}
  }

  // Expose reset on Escape
  useEffect(() => {
    const onKey = (ev) => {
      if (ev.key === "Escape") resetView();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [resetView]);
  // --- end synchronized view utilities ---

  function toCanvasCoords(clientX, clientY) {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();

    // Calcular coordenadas relativas al canvas visual
    const x = clientX - rect.left;
    const y = clientY - rect.top;

    // Convertir a coordenadas del canvas interno (considerando que el canvas puede estar escalado en el DOM)
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    return {
      x: x * scaleX,
      y: y * scaleY,
    };
  }

  function handleClick(e) {
    // Ignore click that immediately follows a rectangle drag
    if (justDrawnRectRef.current) {
      justDrawnRectRef.current = false;
      return;
    }

    // No agregar puntos si estamos arrastrando o acabamos de soltar
    if (dragIndex !== null) return;
    if (points.length >= 4) return;

    // Verificar que no estamos cerca de un punto existente (evitar click accidental)
    const p = toCanvasCoords(e.clientX, e.clientY);
    const nearPoint = points.findIndex(
      (pt) => Math.hypot(pt.x - p.x, pt.y - p.y) < 24,
    );
    if (nearPoint >= 0) return; // Si estamos cerca de un punto, no agregar nuevo

    setPoints((prev) => [...prev, p]);
    setUserEditedPoints(true); // user added a point manually
  }

  function handleMouseDown(e) {
    pushTrace(e);
    const srcEv = e.touches ? e.touches[0] : e;
    const p = toCanvasCoords(srcEv.clientX, srcEv.clientY);

    // check if clicking near existing point -> start dragging that point
    const idx = points.findIndex(
      (pt) => Math.hypot(pt.x - p.x, pt.y - p.y) < 28,
    );
    if (idx >= 0) {
      e.preventDefault();
      e.stopPropagation();
      setDragIndex(idx);
      setUserEditedPoints(true);

      // Lock body scroll while dragging (prevents page scroll interfering)
      lockBodyScroll();

      // Add window-level listeners to track pointer even if it leaves the canvas
      const onMove = (ev) => {
        const src = ev.touches ? ev.touches[0] : ev;
        const q = toCanvasCoords(src.clientX, src.clientY);
        const qc = clampToCanvas(q);
        setPoints((prev) => prev.map((pt, i) => (i === idx ? qc : pt)));
      };
      const onTouchMove = (t) => {
        onMove(t.touches ? t.touches[0] : t);
      };
      const onUp = (ev) => {
        setDragIndex(null);
        unlockBodyScroll();
        window.removeEventListener("mousemove", onMove);
        window.removeEventListener("mouseup", onUp);
        window.removeEventListener("touchmove", onTouchMove);
        window.removeEventListener("touchend", onUp);
      };
      window.addEventListener("mousemove", onMove);
      window.addEventListener("mouseup", onUp);
      window.addEventListener("touchmove", onTouchMove, { passive: false });
      window.addEventListener("touchend", onUp);
      return;
    }

    // If no existing points, start drawing a rectangle by dragging
    if (points.length === 0) {
      e.preventDefault();
      rectStartRef.current = p;
      drawingRectRef.current = true;

      // Lock body scroll while drawing the rect
      lockBodyScroll();

      const onMoveRect = (ev) => {
        const src = ev.touches ? ev.touches[0] : ev;
        const q = toCanvasCoords(src.clientX, src.clientY);
        const qc = clampToCanvas(q);
        const left = Math.min(rectStartRef.current.x, qc.x);
        const right = Math.max(rectStartRef.current.x, qc.x);
        const top = Math.min(rectStartRef.current.y, qc.y);
        const bottom = Math.max(rectStartRef.current.y, qc.y);

        // Set points in order: TL, TR, BL, BR (keeps consistency with prev code)
        // Use TL, TR, BR, BL ordering to avoid self-intersecting polygon
        const rectPts = [
          { x: left, y: top },
          { x: right, y: top },
          { x: right, y: bottom },
          { x: left, y: bottom },
        ];
        setPoints(rectPts);
      };

      const onTouchMoveRect = (t) => onMoveRect(t.touches ? t.touches[0] : t);
      const onUpRect = (ev) => {
        drawingRectRef.current = false;
        justDrawnRectRef.current = true; // prevent subsequent click add
        // small timeout to allow potential click event suppression
        setTimeout(() => {
          justDrawnRectRef.current = false;
        }, 250);

        // mark that user finalized a manual rectangle
        setUserEditedPoints(true);
        unlockBodyScroll();

        window.removeEventListener("mousemove", onMoveRect);
        window.removeEventListener("mouseup", onUpRect);
        window.removeEventListener("touchmove", onTouchMoveRect);
        window.removeEventListener("touchend", onUpRect);
      };

      window.addEventListener("mousemove", onMoveRect);
      window.addEventListener("mouseup", onUpRect);
      window.addEventListener("touchmove", onTouchMoveRect, { passive: false });
      window.addEventListener("touchend", onUpRect);
    }
  }

  function handleMouseMove(e) {
    pushTrace(e);
    const p = toCanvasCoords(e.clientX, e.clientY);

    // Si estamos arrastrando
    if (dragIndex !== null) {
      const qc = clampToCanvas(p);
      setPoints((prev) => prev.map((pt, i) => (i === dragIndex ? qc : pt)));
      return;
    }

    // Detectar hover
    const idx = points.findIndex(
      (pt) => Math.hypot(pt.x - p.x, pt.y - p.y) < 24,
    );
    setHoveredIndex(idx >= 0 ? idx : null);
  }

  function handleMouseUp() {
    pushTrace({ type: "mouseup", clientX: null, clientY: null });
    setDragIndex(null);
    unlockBodyScroll();
  }

  function handleMouseLeave() {
    setDragIndex(null);
    setHoveredIndex(null);
  }

  function reset() {
    setPoints([]);
    markPreviewGenerated(false);
    setErrorDeteccion(null);
    setUserEditedPoints(false);
  }

  // React component: RestoreButton - creates a preview crop (if needed), sends it to /api/yolo/restore
  function RestoreButton({ points, setErrorDeteccion, generatePreview }) {
    const [restoring, setRestoring] = useState(false);

    const doRestore = async () => {
      if (points.length !== 4) return;
      setErrorDeteccion(null);

      // Ensure preview exists
      if (!previewGenerated) {
        generatePreview();
        if (typeof markPreviewGenerated === "function") {
          markPreviewGenerated(true);
        } else {
          previewGeneratedRef.current = true;
          if (typeof setPreviewGenerated === "function")
            setPreviewGenerated(true);
        }
        // wait a tick for preview canvas to be painted
        await new Promise((r) => setTimeout(r, 120));
      }

      const prevCanvas = origPreviewRef.current || previewCanvasRef.current;
      if (!prevCanvas) {
        setErrorDeteccion("No hay preview para restaurar");
        return;
      }

      setRestoring(true);
      try {
        await new Promise((r) => setTimeout(r, 10)); // tiny pause
        const blob = await new Promise((resolve) =>
          prevCanvas.toBlob(resolve, "image/jpeg", 0.95),
        );
        if (!blob) throw new Error("No se pudo generar el blob del recorte");

        // Ensure backend service status
        let status = yoloStatus;
        if (!status) {
          try {
            const sres = await fetch(`${VISION_SERVICE_URL}/status`);
            if (sres.ok) status = await sres.json();
            else status = { ok: false };
            setYoloStatus(status);
          } catch (e) {
            setErrorDeteccion(
              "No se pudo contactar el servicio de restauración",
            );
            pushRestoreEvent("Error: no se pudo contactar el servicio");
            setProcessingPreview(false);
            return;
          }
        }
        if (!status.ok || !status.cv2_installed) {
          setErrorDeteccion(
            "Servicio de restauración no disponible: faltan dependencias (opencv/numpy/pillow) o el servicio no responde.",
          );
          pushRestoreEvent("Servicio no disponible");
          setProcessingPreview(false);
          return;
        }

        const fd = new FormData();
        fd.append("image", blob, "cropped.jpg");

        // Push event and show overlay
        pushRestoreEvent("Enviando imagen al servicio...");
        setProcessingPreview(true);

        const res = await fetch(`${VISION_SERVICE_URL}/restore`, {
          method: "POST",
          body: fd,
        });

        // Server received and is processing
        pushRestoreEvent("Servidor: imagen recibida, procesando...");

        const data = await res.json();
        if (!res.ok || !data.ok) {
          let reason =
            data.error || data.reason || "Error al restaurar el documento";
          if (
            String(reason).toLowerCase().includes("missing python requirements")
          ) {
            reason = `${reason} — Iniciá el microservicio YOLO y verificá dependencias (opencv, pillow, ultralytics, torch/docres).`;
          }
          setErrorDeteccion(reason);
          pushRestoreEvent("Error: " + reason);
          return;
        }

        // Show restored image in the preview canvas
        if (data.restored_image_base64) {
          const img = new Image();
          img.onload = () => {
            const origCanvas =
              origPreviewRef.current || previewCanvasRef.current;
            const enhCanvas =
              enhancedPreviewRef.current || previewCanvasRef.current;
            if (!origCanvas || !enhCanvas) return;

            // Normalize enhanced to original offscreen size so both compare equally
            const targetW = offscreenOrigRef.current
              ? offscreenOrigRef.current.width
              : img.width;
            const targetH = offscreenOrigRef.current
              ? offscreenOrigRef.current.height
              : img.height;

            // Create offscreen enhanced canvas at same size
            const offE = document.createElement("canvas");
            offE.width = targetW;
            offE.height = targetH;
            const offECtx = offE.getContext("2d");
            // draw the loaded img scaled to target size
            offECtx.drawImage(img, 0, 0, targetW, targetH);
            offscreenEnhRef.current = offE;

            // Ensure visible canvases match intrinsic size
            enhCanvas.width = targetW;
            enhCanvas.height = targetH;
            origCanvas.width = targetW;
            origCanvas.height = targetH;

            // Render with current transform
            renderView();

            markPreviewGenerated(true)(
              // Store enhanced preview and file (for saving when user accepts the crop)
              async () => {
                try {
                  const dataUrl =
                    "data:image/png;base64," + data.restored_image_base64;
                  setEnhancedPreview(dataUrl);
                  const blob = await (await fetch(dataUrl)).blob();
                  const enhancedF = new File(
                    [blob],
                    `enhanced-${Date.now()}.png`,
                    { type: blob.type || "image/png" },
                  );
                  setEnhancedFile(enhancedF);
                } catch (e) {
                  console.warn(
                    "No se pudo crear archivo de versión mejorada:",
                    e,
                  );
                  setEnhancedFile(null);
                  setEnhancedPreview(null);
                }
              },
            )();
            setDebugInfo((prev) => ({
              ...prev,
              restoredModel: data.model,
              restoredTimingMs: data.timing_ms,
              restoredParams: data.params,
            }));
            if (data.fallback) {
              pushRestoreEvent("Se aplicó fallback conservador");
              setRestoreStatus("Se aplicó fallback conservador");
            } else {
              pushRestoreEvent("Restauración completada");
              setRestoreStatus("Restauración completada");
            }
            setErrorDeteccion(null);
          };
          img.src = "data:image/png;base64," + data.restored_image_base64;
        }
      } catch (err) {
        console.error("Error restaurando:", err);
        setErrorDeteccion(String(err));
        pushRestoreEvent("Error: " + String(err));
        // fallback to local enhancement
        await localEnhance();
      } finally {
        setRestoring(false);
        setProcessingPreview(false);
      }
    };

    return (
      <div className="flex gap-2">
        <button
          onClick={doRestore}
          disabled={points.length !== 4 || restoring}
          className={`min-w-[180px] whitespace-nowrap flex items-center justify-center px-4 py-2.5 rounded-lg border transition-all duration-300 ${restoring ? "bg-gray-200 text-gray-500 cursor-not-allowed" : "bg-yellow-100 text-yellow-800 hover:bg-yellow-200"}`}
        >
          <span className="inline-flex items-center gap-2">
            {restoring && (
              <svg
                className="animate-spin h-4 w-4 text-yellow-800"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="3"
                ></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                ></path>
              </svg>
            )}
            <span className="inline-block">🧼 Restaurar documento</span>
          </span>
        </button>
      </div>
    );
  }

  // Accept overrideYoloConf so callers (e.g. slider) can run detection immediately with the new value
  const detectarAutomaticamente = async (
    force = false,
    overrideYoloConf = null,
  ) => {
    // If user manually edited points and this is not a forced re-detect, do not overwrite
    if (userEditedPoints && !force) {
      setErrorDeteccion(
        'Caja ajustada manualmente. Usa "Reintentar" para ejecutar la detección con el umbral seleccionado.',
      );
      return;
    }

    setDetectando(true);
    setErrorDeteccion(null);

    try {
      const canvas = canvasRef.current;
      if (!canvas) throw new Error("Canvas no disponible");

      // Abort controller for fetch
      detectControllerRef.current = new AbortController();
      const signal = detectControllerRef.current.signal;

      // Fetch image blob from src
      const imgResp = await fetch(src);
      if (!imgResp.ok) throw new Error("No se pudo descargar la imagen");
      const blob = await imgResp.blob();

      const fd = new FormData();
      fd.append("image", blob, "upload.jpg");
      fd.append("action", "crop");
      // Allow overriding YOLO confidence per-request (useful when slider changes)
      try {
        fd.append(
          "yolo_conf",
          String(overrideYoloConf !== null ? overrideYoloConf : yoloConf),
        );
      } catch (e) {
        /* noop */
      }

      const timeoutMs = 20000;
      const timeout = setTimeout(() => {
        try {
          detectControllerRef.current?.abort();
        } catch (e) {}
      }, timeoutMs);

      // Call Docker YOLO service via API proxy
      const res = await fetch(`/api/ai/image`, {
        method: "POST",
        body: fd,
        signal,
      });
      clearTimeout(timeout);

      if (!res.ok) {
        let err = { error: "Unknown error" };
        try {
          err = await res.json();
        } catch {
          err = { error: await res.text().catch(() => "") };
        }
        setErrorDeteccion(err.reason || err.error || String(err));
        return;
      }

      const data = await res.json();
      if (!data.ok) {
        // If YOLO/opencv failed to find a document, select full image for manual editing
        // BUT preserve user's existing selection if they already moved points
        setErrorDeteccion(
          data.reason || data.error || "No se detectó un documento",
        );
        // Ignorar imagen de debug de selección (ya no se muestra)
        const canvas = canvasRef.current;
        if (canvas && points.length === 0) {
          const full = [
            { x: 0, y: 0 },
            { x: 1, y: 0 },
            { x: 1, y: 1 },
            { x: 0, y: 1 },
          ];
          setPoints(full);
          setUserEditedPoints(false); // automatic full selection, not a manual edit
          if (typeof markPreviewGenerated === "function") {
            markPreviewGenerated(false);
          } else {
            previewGeneratedRef.current = false;
            if (typeof setPreviewGenerated === "function")
              setPreviewGenerated(false);
          }
        }
        return;
      }

      // Map returned points to normalized coordinates expected by the cropper (0..1)
      const mapped = (data.points || []).map((p) => {
        // Already normalized (0..1)
        if (
          typeof p.x === "number" &&
          typeof p.y === "number" &&
          p.x <= 1 &&
          p.y <= 1
        ) {
          return { x: Number(p.x), y: Number(p.y) };
        }
        // Absolute pixels -> normalize using image_size when available, otherwise infer from canvas and scale
        const imgW =
          data.image_size && data.image_size.width
            ? data.image_size.width
            : canvas
              ? canvas.width /
                (canvas.dataset.scale ? Number(canvas.dataset.scale) : 1)
              : 1;
        const imgH =
          data.image_size && data.image_size.height
            ? data.image_size.height
            : canvas
              ? canvas.height /
                (canvas.dataset.scale ? Number(canvas.dataset.scale) : 1)
              : 1;
        return { x: Number(p.x) / imgW, y: Number(p.y) / imgH };
      });
      if (mapped.length === 4) {
        setPoints(mapped);
        setUserEditedPoints(false); // automatic detection replaced points
        // Clear errors and save detection method
        setErrorDeteccion(null);
        setLastDetectMethod(data.method || null);
      } else {
        setErrorDeteccion("Respuesta inválida del servicio YOLO");
        setLastDetectMethod(data.method || null);
      }
    } catch (err) {
      if (err.name === "AbortError") setErrorDeteccion("Detección cancelada");
      else {
        console.error("Error detectando:", err);
        setErrorDeteccion(String(err));
      }
    } finally {
      setDetectando(false);
      if (detectControllerRef.current) detectControllerRef.current = null;
    }
  };

  // Header-level enhancement control (used by the header button)
  const [enhancingHeader, setEnhancingHeader] = useState(false);
  const [yoloConf, setYoloConf] = useState(0.8); // confianza para detectar crops (0.0 - 1.0)
  const [lastDetectMethod, setLastDetectMethod] = useState(null);

  // If the user manually adjusted points, we should not let automatic detection overwrite them
  const [userEditedPoints, setUserEditedPoints] = useState(false);

  // Store feature backups (e.g., enhanced preview) so we can hide UI but restore later
  const [features, setFeatures] = useState({});

  // computed helpers
  const enhancementAvailable =
    yoloStatus && yoloStatus.ok && points.length === 4 && !enhancedPreview;

  const enhanceDocumentHeader = async () => {
    setErrorDeteccion(null);

    // If there are no points, auto-select the full image and proceed
    if (points.length !== 4) {
      if (points.length === 0) {
        const canvas = canvasRef.current;
        if (!canvas) {
          setErrorDeteccion("Canvas no disponible");
          return;
        }
        const fullPts = [
          { x: 0, y: 0 },
          { x: 1, y: 0 },
          { x: 1, y: 1 },
          { x: 0, y: 1 },
        ];
        setPoints(fullPts);
        markPreviewGenerated(false);
        // Give time for preview generation
        await new Promise((r) => setTimeout(r, 120));
      } else {
        // Partial selection: ask user to complete or use Enfocar Documento
        setErrorDeteccion(
          'Por favor seleccioná 4 vértices o ejecutá "Enfocar Documento" antes de mejorar',
        );
        return;
      }
    }

    // Ensure preview exists
    if (!previewGenerated) {
      generatePreview();
      if (typeof markPreviewGenerated === "function") {
        markPreviewGenerated(true);
      } else {
        previewGeneratedRef.current = true;
        if (typeof setPreviewGenerated === "function")
          setPreviewGenerated(true);
      }
      await new Promise((r) => setTimeout(r, 160));
    }

    const prevCanvas = origPreviewRef.current || previewCanvasRef.current;
    if (!prevCanvas) {
      setErrorDeteccion("No hay preview para mejorar");
      return;
    }

    setEnhancingHeader(true);
    try {
      const blob = await new Promise((resolve) =>
        prevCanvas.toBlob(resolve, "image/jpeg", 0.95),
      );
      if (!blob) throw new Error("No se pudo generar el blob del recorte");

      const fd = new FormData();
      fd.append("image", blob, "cropped.jpg");
      fd.append("enhance", "1");

      // Agregar parámetros de mejora desde localStorage
      let sentParams = {};
      try {
        const params = localStorage.getItem("imageEnhancementParams");
        if (params) {
          const parsed = JSON.parse(params);
          sentParams = parsed;
          if (parsed.clahe_clip !== undefined)
            fd.append("clahe_clip", parsed.clahe_clip);
          if (parsed.kernel_size !== undefined)
            fd.append("kernel_size", parsed.kernel_size);
          if (parsed.shadow_threshold !== undefined)
            fd.append("shadow_threshold", parsed.shadow_threshold);
          if (parsed.brightness_boost !== undefined)
            fd.append("brightness_boost", parsed.brightness_boost);
          if (parsed.denoise_strength !== undefined)
            fd.append("denoise_strength", parsed.denoise_strength);
          if (parsed.sharpen_amount !== undefined)
            fd.append("sharpen_amount", parsed.sharpen_amount);
          if (parsed.contrast_boost !== undefined)
            fd.append("contrast_boost", parsed.contrast_boost);
        }
      } catch (e) {
        console.warn("No se pudieron cargar parámetros de mejora:", e);
      }

      // Push event + overlay
      pushRestoreEvent("Enviando imagen al servicio...");
      if (Object.keys(sentParams).length > 0) {
        pushRestoreEvent("Parámetros enviados: " + JSON.stringify(sentParams));
        setDebugInfo((prev) => ({ ...prev, sentParams }));
      }
      setProcessingPreview(true);

      const res = await fetch(`${VISION_SERVICE_URL}/restore`, {
        method: "POST",
        body: fd,
      });

      pushRestoreEvent("Servidor: imagen recibida, procesando...");

      const data = await res.json();
      if (!res.ok || !data.ok) {
        // Show specific reason when available and add actionable hint for missing deps
        let reason =
          data?.error || data?.reason || "Error mejorando el documento";
        if (
          String(reason)
            .toLowerCase()
            .includes("missing python requirements") ||
          String(reason).toLowerCase().includes("missing")
        ) {
          reason = `${reason} — El servicio de mejora no está disponible. Iniciá el microservicio YOLO en el servidor (verificar dependencias: opencv, pillow, ultralytics, torch/docres si usás DocRes).`;
        }
        setErrorDeteccion(reason);
        pushRestoreEvent("Error: " + reason);
        setProcessingPreview(false);
        return;
      }

      if (data.restored_image_base64) {
        const img = new Image();
        img.onload = () => {
          const origCanvas = origPreviewRef.current || previewCanvasRef.current;
          const enhCanvas =
            enhancedPreviewRef.current || previewCanvasRef.current;
          if (!origCanvas || !enhCanvas) return;

          enhCanvas.width = origCanvas.width;
          enhCanvas.height = origCanvas.height;
          const ctx = enhCanvas.getContext("2d");
          ctx.clearRect(0, 0, enhCanvas.width, enhCanvas.height);
          ctx.drawImage(img, 0, 0, enhCanvas.width, enhCanvas.height);

          if (typeof markPreviewGenerated === "function") {
            markPreviewGenerated(true);
          } else {
            previewGeneratedRef.current = true;
            if (typeof setPreviewGenerated === "function")
              setPreviewGenerated(true);
          }
          // Store enhanced preview and file for later saving
          (async () => {
            try {
              const dataUrl =
                "data:image/png;base64," + data.restored_image_base64;
              setEnhancedPreview(dataUrl);
              const blob = await (await fetch(dataUrl)).blob();
              const enhancedF = new File([blob], `enhanced-${Date.now()}.png`, {
                type: blob.type || "image/png",
              });
              setEnhancedFile(enhancedF);
            } catch (e) {
              console.warn("No se pudo crear archivo de versión mejorada:", e);
            }
          })();
          setDebugInfo((prev) => ({
            ...prev,
            restoredModel: data.model,
            restoredTimingMs: data.timing_ms,
            restoredParams: data.params,
          }));
          if (data.fallback) {
            pushRestoreEvent("Se aplicó fallback conservador");
            setRestoreStatus("Se aplicó fallback conservador");
          } else {
            pushRestoreEvent("Restauración completada");
            setRestoreStatus("Restauración completada");
          }
          setErrorDeteccion(null);
          setProcessingPreview(false);
        };
        img.src = "data:image/png;base64," + data.restored_image_base64;
      } else if (data.ok === false && data.error) {
        // If backend is missing, attempt local enhancement fallback
        console.warn("Backend restore failed, reason:", data.error);
        // Run local canvas-based enhancement as fallback
        await localEnhance();
      }
    } catch (err) {
      console.error("Error mejorando (header):", err);
      setErrorDeteccion(String(err));
      pushRestoreEvent("Error: " + String(err));
      setProcessingPreview(false);
    } finally {
      setEnhancingHeader(false);
      setProcessingPreview(false);
    }
  };

  // Local client-side enhancement fallback (canvas-based)
  async function localEnhance() {
    setErrorDeteccion(null);
    const start = performance.now();
    if (!previewGenerated) {
      generatePreview();
      markPreviewGenerated(true);
      await new Promise((r) => setTimeout(r, 120));
    }
    const orig = origPreviewRef.current || previewCanvasRef.current;
    const enh = enhancedPreviewRef.current || previewCanvasRef.current;
    if (!orig || !enh) {
      setErrorDeteccion("No hay preview para mejorar");
      return;
    }

    // Work on a temporary canvas (scale down for speed)
    const maxW = 800;
    const w = orig.width;
    const h = orig.height;
    const scale = Math.min(1, maxW / w);
    const tw = Math.max(1, Math.round(w * scale));
    const th = Math.max(1, Math.round(h * scale));

    const tmp = document.createElement("canvas");
    tmp.width = tw;
    tmp.height = th;
    const tctx = tmp.getContext("2d");
    tctx.drawImage(orig, 0, 0, tw, th);

    let imgData = tctx.getImageData(0, 0, tw, th);
    const data = imgData.data;

    // Simple enhancement: brighten darks (gamma-like), mild contrast, and unsharp-ish
    // Convert to float and process
    const gammaBoost = 1.12;
    for (let i = 0; i < data.length; i += 4) {
      // RGB -> normalize
      let r = data[i] / 255;
      let g = data[i + 1] / 255;
      let b = data[i + 2] / 255;
      // luminance
      const L = 0.2126 * r + 0.7152 * g + 0.0722 * b;
      if (L < 0.6) {
        // boost darker regions slightly
        const factor = 1 + (0.6 - L) * 0.35;
        r = Math.min(1, Math.pow(r * factor, 1 / 1.05));
        g = Math.min(1, Math.pow(g * factor, 1 / 1.05));
        b = Math.min(1, Math.pow(b * factor, 1 / 1.05));
      }
      // apply gamma-ish global lift
      r = Math.min(1, Math.pow(r, 1 / gammaBoost));
      g = Math.min(1, Math.pow(g, 1 / gammaBoost));
      b = Math.min(1, Math.pow(b, 1 / gammaBoost));

      // contrast stretch
      r = Math.min(1, Math.max(0, (r - 0.5) * 1.06 + 0.5));
      g = Math.min(1, Math.max(0, (g - 0.5) * 1.06 + 0.5));
      b = Math.min(1, Math.max(0, (b - 0.5) * 1.06 + 0.5));

      data[i] = Math.round(r * 255);
      data[i + 1] = Math.round(g * 255);
      data[i + 2] = Math.round(b * 255);
    }

    // mild box blur for smoothing (3x3 pass)
    function boxBlur(srcData, w, h) {
      const out = new Uint8ClampedArray(srcData.length);
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          let r = 0,
            g = 0,
            b = 0,
            cnt = 0;
          for (let oy = -1; oy <= 1; oy++)
            for (let ox = -1; ox <= 1; ox++) {
              const nx = x + ox,
                ny = y + oy;
              if (nx >= 0 && nx < w && ny >= 0 && ny < h) {
                const idx = (ny * w + nx) * 4;
                r += srcData[idx];
                g += srcData[idx + 1];
                b += srcData[idx + 2];
                cnt++;
              }
            }
          const idx = (y * w + x) * 4;
          out[idx] = Math.round(r / cnt);
          out[idx + 1] = Math.round(g / cnt);
          out[idx + 2] = Math.round(b / cnt);
          out[idx + 3] = srcData[idx + 3];
        }
      }
      return out;
    }

    const blurred = boxBlur(data, tw, th);
    // Blend unsharp: final = orig*0.88 + blurred*0.12
    for (let i = 0; i < data.length; i += 4) {
      data[i] = Math.round(data[i] * 0.88 + blurred[i] * 0.12);
      data[i + 1] = Math.round(data[i + 1] * 0.88 + blurred[i + 1] * 0.12);
      data[i + 2] = Math.round(data[i + 2] * 0.88 + blurred[i + 2] * 0.12);
    }

    tctx.putImageData(imgData, 0, 0);

    // Draw local enhancement into enhanced canvas scaled to orig size
    enh.width = w;
    enh.height = h;
    const enhCtx = enh.getContext("2d");
    enhCtx.clearRect(0, 0, w, h);
    enhCtx.drawImage(tmp, 0, 0, tw, th, 0, 0, w, h);

    const png = enh.toDataURL("image/png")(
      // Save local enhancement result as enhanced preview/file
      async () => {
        try {
          setEnhancedPreview(png);
          const blob = await (await fetch(png)).blob();
          const enhancedF = new File(
            [blob],
            `enhanced-local-${Date.now()}.png`,
            { type: blob.type || "image/png" },
          );
          setEnhancedFile(enhancedF);
        } catch (e) {
          console.warn(
            "No se pudo crear archivo de versión mejorada local:",
            e,
          );
        }
      },
    )();
    const elapsed = Math.round(performance.now() - start);
    setDebugInfo((prev) => ({
      ...prev,
      restoredModel: "local_fallback",
      restoredTimingMs: elapsed,
    }));
    setErrorDeteccion(null);
  }

  async function applyCrop() {
    if (points.length !== 4) {
      alert("Por favor selecciona 4 vértices antes de aplicar el recorte");
      return;
    }
    const canvas = canvasRef.current;
    const img = imgRef.current;
    const scale = canvas.dataset.scale ? Number(canvas.dataset.scale) : 1;

    // Convert canvas points back to original image coords
    let srcPts = points.map((p) => ({ x: p.x / scale, y: p.y / scale }));

    // ORDENAR PUNTOS: Top-Left, Top-Right, Bottom-Left, Bottom-Right
    // 1. Ordenar por Y (arriba primero)
    srcPts.sort((a, b) => a.y - b.y);

    // 2. Los 2 primeros son top, los 2 últimos son bottom
    const topPoints = srcPts.slice(0, 2).sort((a, b) => a.x - b.x); // Ordenar por X
    const bottomPoints = srcPts.slice(2, 4).sort((a, b) => a.x - b.x);

    // 3. Asignar en orden: TL, TR, BL, BR
    srcPts = [
      topPoints[0], // Top-Left
      topPoints[1], // Top-Right
      bottomPoints[0], // Bottom-Left
      bottomPoints[1], // Bottom-Right
    ];

    // Destination rectangle size: calculate width as average top and bottom edge lengths, height as average left/right
    const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
    const top = dist(srcPts[0], srcPts[1]);
    const bottom = dist(srcPts[2], srcPts[3]);
    const left = dist(srcPts[0], srcPts[2]);
    const right = dist(srcPts[1], srcPts[3]);
    const dstW = Math.round((top + bottom) / 2);
    const dstH = Math.round((left + right) / 2);

    // Destination rectangle points (ordenados: TL, TR, BL, BR)
    const dstPts = [
      { x: 0, y: 0 },
      { x: dstW - 1, y: 0 },
      { x: 0, y: dstH - 1 },
      { x: dstW - 1, y: dstH - 1 },
    ];

    const H = computeHomography(srcPts, dstPts);
    const invH = invertHomography(H);
    if (!invH) {
      alert("No se pudo calcular la homografía");
      return;
    }

    // Create source imageData
    const tmpCanvas = document.createElement("canvas");
    tmpCanvas.width = img.width;
    tmpCanvas.height = img.height;
    const tctx = tmpCanvas.getContext("2d");
    tctx.drawImage(img, 0, 0);
    const srcData = tctx.getImageData(0, 0, tmpCanvas.width, tmpCanvas.height);

    // Create dest canvas
    const dstCanvas = document.createElement("canvas");
    dstCanvas.width = dstW;
    dstCanvas.height = dstH;
    const dctx = dstCanvas.getContext("2d");
    const dstImage = dctx.createImageData(dstW, dstH);

    // For each pixel in dst, map back to src via inverse homography
    const inv = invH;
    for (let y = 0; y < dstH; y++) {
      for (let x = 0; x < dstW; x++) {
        const denom = inv[6] * x + inv[7] * y + inv[8];
        const sx = (inv[0] * x + inv[1] * y + inv[2]) / denom;
        const sy = (inv[3] * x + inv[4] * y + inv[5]) / denom;

        const color = bilinearSample(
          srcData.data,
          sx,
          sy,
          tmpCanvas.width,
          tmpCanvas.height,
        );
        const idx = (y * dstW + x) * 4;
        dstImage.data[idx] = color[0];
        dstImage.data[idx + 1] = color[1];
        dstImage.data[idx + 2] = color[2];
        dstImage.data[idx + 3] = color[3];
      }
    }

    dctx.putImageData(dstImage, 0, 0);

    // Convert to blob and return File con la imagen croppeada
    dstCanvas.toBlob(
      async (blob) => {
        const croppedFile = new File([blob], `cropped-${Date.now()}.jpg`, {
          type: "image/jpeg",
        });
        const croppedPreview = URL.createObjectURL(blob);
        setCroppedPreview(croppedPreview);

        // También convertir la imagen original a File
        const originalCanvas = document.createElement("canvas");
        originalCanvas.width = img.width;
        originalCanvas.height = img.height;
        const octx = originalCanvas.getContext("2d");
        octx.drawImage(img, 0, 0);

        originalCanvas.toBlob(
          async (originalBlob) => {
            const originalFile = new File(
              [originalBlob],
              `original-${Date.now()}.jpg`,
              { type: "image/jpeg" },
            );
            const originalPreview = URL.createObjectURL(originalBlob);
            setOriginalPreview(originalPreview);

            // Si hay una versión mejorada generada por la acción de 'Mejorar', anexarla
            const payload = {
              cropped: { file: croppedFile, preview: croppedPreview },
              original: { file: originalFile, preview: originalPreview },
            };
            if (enhancedFile && enhancedPreview) {
              payload.enhanced = {
                file: enhancedFile,
                preview: enhancedPreview,
              };
            }

            onCrop(payload);
          },
          "image/jpeg",
          0.95,
        );
      },
      "image/jpeg",
      0.95,
    );
  }

  // Cleanup blob URLs
  useEffect(() => {
    return () => {
      if (originalPreview) URL.revokeObjectURL(originalPreview);
      if (enhancedPreview) URL.revokeObjectURL(enhancedPreview);
      if (croppedPreview) URL.revokeObjectURL(croppedPreview);
    };
  }, []);

  if (overlayOnly) {
    return (
      <div className="w-full h-full flex flex-col gap-4">
        <div className="flex gap-4 h-full">
          <div className="h-full w-full">
            <div
              ref={leftContainerRef}
              style={{ position: "relative", height: "100%" }}
            >
              <canvas
                ref={canvasRef}
                onClick={handleClick}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseLeave}
                className="w-full rounded-lg shadow-lg border-2 border-blue-400 h-full"
                style={{
                  display: "block",
                  width: "100%",
                  height: "100%",
                  touchAction: "none",
                  userSelect: "none",
                  cursor: isPanningRef.current ? "grabbing" : "crosshair",
                  transform: `scale(${zoom}) translate(${pan.x}px, ${pan.y}px)`,
                  transformOrigin: "top left",
                }}
              />

              <canvas
                ref={previewOverlayRef}
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  width: "100%",
                  height: "100%",
                  display: "none",
                  pointerEvents: "none",
                  zIndex: 50,
                }}
              />

              {/* Point markers overlay (DOM) to ensure selection points are visible even if canvas drawing is off) */}
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  pointerEvents: isPanning ? "none" : "auto",
                  zIndex: 55,
                }}
              >
                {points &&
                  points.length > 0 &&
                  (() => {
                    try {
                      const canvas = canvasRef.current;
                      const dpr = dprRef.current || 1;
                      return points.map((pt, idx) => {
                        // pt is normalized [0..1]; convert to % position
                        const left = (pt.x || 0) * 100;
                        const top = (pt.y || 0) * 100;
                        return (
                          <div
                            key={idx}
                            onPointerDown={(ev) => {
                              if (isPanning) return;
                              try {
                                ev.preventDefault();
                                ev.stopPropagation();
                              } catch (e) {}
                              startPointDrag(idx, ev);
                            }}
                            style={{
                              position: "absolute",
                              left: `${left}%`,
                              top: `${top}%`,
                              transform: "translate(-50%,-50%)",
                              width: 28,
                              height: 28,
                              borderRadius: 9999,
                              background: "rgba(255,255,255,0.95)",
                              border: "2px solid #2563eb",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              fontSize: 12,
                              fontWeight: "600",
                              color: "#2563eb",
                              pointerEvents: isPanning ? "none" : "auto",
                              cursor: "grab",
                            }}
                          >
                            {idx + 1}
                          </div>
                        );
                      });
                    } catch (e) {
                      return null;
                    }
                  })()}
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <div className="text-sm text-gray-600">
              {errorDeteccion && (
                <div className="text-red-600 mt-2">{errorDeteccion}</div>
              )}
              {restoreStatus && (
                <div className="text-yellow-700 mt-2">{restoreStatus}</div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="fixed left-0 right-0 bg-black bg-opacity-90 z-50 flex items-start justify-center"
      style={{
        top: modalTop + "px",
        maxHeight: `calc(100vh - ${modalTop}px - 16px)`,
      }}
    >
      <div className="bg-white rounded-xl shadow-2xl w-[95vw] h-[95vh] flex flex-col">
        <div className="p-4 border-b border-gray-200 flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-lg text-gray-900">
              ✂️ Crop manual (4 vértices)
            </h3>
            <p className="text-sm text-gray-600 mt-1">
              {points.length < 4
                ? "Usa detección automática o haz click 4 veces para marcar los vértices del documento"
                : "¡Perfecto! Ahora puedes arrastrar los puntos para ajustar o ver la previsualización"}
            </p>
            {/* Reserve vertical space for error messages to avoid layout shift */}
            <p
              className="text-xs text-yellow-600 mt-1 font-medium min-h-[20px]"
              role="status"
              aria-live="polite"
            >
              {errorDeteccion ? `⚠️ ${errorDeteccion}` : ""}
            </p>

            {/* Single-line status (sequential messages only, replaces error display) */}
            <p
              className="text-xs text-yellow-600 mt-1 font-medium min-h-[20px]"
              role="status"
              aria-live="polite"
            >
              {restoreStatus
                ? `ℹ️ ${restoreStatus}`
                : errorDeteccion
                  ? `⚠️ ${errorDeteccion}`
                  : ""}
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => detectarAutomaticamente(false)}
              disabled={detectando || userEditedPoints}
              title={
                userEditedPoints
                  ? 'Caja ajustada manualmente — usa "Reintentar" para ejecutar la detección'
                  : ""
              }
              className={`min-w-[180px] whitespace-nowrap flex items-center justify-center px-4 py-2.5 rounded-lg border transition-all duration-300 ${detectando || userEditedPoints ? "bg-gray-200 text-gray-400 cursor-not-allowed" : "bg-purple-600 text-white border-purple-600 hover:bg-purple-700 shadow-lg"}`}
            >
              <span className="inline-flex items-center gap-2">
                {(detectando || userEditedPoints) && (
                  <svg
                    className="animate-spin h-4 w-4 text-white"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="3"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                    ></path>
                  </svg>
                )}
                <span className="inline-block">🔍 Enfocar Documento</span>
              </span>
            </button>

            {enhancementAvailable ? (
              <button
                onClick={enhanceDocumentHeader}
                className={`min-w-[180px] whitespace-nowrap flex items-center justify-center px-4 py-2.5 rounded-lg border transition-all duration-300 ${enhancingHeader ? "bg-gray-200 text-gray-400 cursor-not-allowed" : "bg-indigo-600 text-white border-indigo-600 hover:bg-indigo-700 shadow-lg"}`}
                disabled={enhancingHeader}
                title={
                  yoloStatus && !yoloStatus.ok
                    ? yoloStatus.error || "Servicio de mejora no disponible"
                    : ""
                }
              >
                <span className="inline-flex items-center gap-2">
                  {enhancingHeader && (
                    <svg
                      className="animate-spin h-4 w-4 text-white"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="3"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                      ></path>
                    </svg>
                  )}
                  <span className="inline-block">✨ Mejorar documento</span>
                </span>
              </button>
            ) : enhancedPreview ? (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    // backup then clear displayed enhancement (keep in features)
                    setFeatures((prev) => ({
                      ...prev,
                      enhancedBackup: {
                        preview: enhancedPreview,
                        file: enhancedFile,
                      },
                    }));
                    setEnhancedPreview(null);
                    setEnhancedFile(null);
                  }}
                  className="px-3 py-1.5 rounded-lg border bg-red-50 text-red-700 hover:bg-red-100"
                >
                  🗑 Eliminar mejora
                </button>
                <button
                  onClick={() => {
                    const b = features?.enhancedBackup;
                    if (b) {
                      setEnhancedPreview(b.preview);
                      setEnhancedFile(b.file);
                      setFeatures((prev) => ({
                        ...prev,
                        enhancedBackup: undefined,
                      }));
                    }
                  }}
                  className="px-3 py-1.5 rounded-lg border bg-gray-50 hover:bg-gray-100"
                >
                  ↩️ Restaurar mejora
                </button>
              </div>
            ) : null}

            <button
              onClick={reset}
              className="px-3 py-1.5 rounded-lg border bg-gray-50 hover:bg-gray-100"
            >
              🔄 Reset
            </button>
            <button
              onClick={onCancel}
              className="px-3 py-1.5 rounded-lg border bg-red-50 text-red-700 hover:bg-red-100"
            >
              ✖ Cancelar
            </button>
            <button
              onClick={async () => {
                try {
                  const d = debugTraceRef.current || [];
                  // copy to clipboard
                  try {
                    await navigator.clipboard.writeText(JSON.stringify(d));
                  } catch (e) {
                    console.warn("Clipboard write failed", e);
                  }
                  // also POST to server-side debug trace endpoint
                  try {
                    await fetch(`${VISION_SERVICE_URL}/debug/trace`, {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ trace: d, src }),
                    });
                  } catch (e) {
                    console.warn("POST trace failed", e);
                  }
                  // user feedback
                  alert(
                    "Debug trace copied to clipboard and sent to server (if available)",
                  );
                } catch (e) {
                  console.warn("Export trace failed", e);
                  alert("No se pudo exportar el trace: " + String(e));
                }
              }}
              className="px-3 py-1.5 rounded-lg border bg-gray-50 hover:bg-gray-100"
            >
              🐞 Export trace
            </button>
          </div>

          {/* Detección: mostrar método y controles para fallback */}
          <div className="p-3 border-t border-gray-100">
            {(lastDetectMethod || points.length > 0) && (
              <div className="text-sm text-gray-700">
                <div className="flex items-center gap-2">
                  <span className="font-medium">Método detección:</span>
                  <span className="px-2 py-0.5 bg-gray-100 rounded text-xs">
                    {lastDetectMethod || "manual"}
                  </span>
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <label className="text-xs">Conf. YOLO</label>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    value={yoloConf}
                    onChange={(e) => {
                      const v = Number(e.target.value);
                      setYoloConf(v);
                      detectarAutomaticamente(false, v);
                    }}
                  />
                  <span className="text-xs w-12">{yoloConf.toFixed(2)}</span>
                  <button
                    onClick={() => detectarAutomaticamente(true)}
                    className="px-2 py-1 bg-yellow-100 rounded text-sm"
                  >
                    Reintentar
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-auto p-4">
          <div
            className="relative bg-gray-900 rounded-lg flex flex-col md:flex-row items-start justify-center gap-4"
            style={{ minHeight: "400px" }}
          >
            {/* Main canvas area */}
            <div className="flex-1 flex items-center justify-center p-2">
              <canvas
                ref={canvasRef}
                onClick={handleClick}
                onMouseDown={(e) => {
                  handleMouseDown(e);
                  handleMouseDownLocal(e);
                }}
                onMouseMove={(e) => {
                  handleMouseMove(e);
                  handleMouseMoveLocal(e);
                }}
                onMouseUp={(e) => {
                  handleMouseUp(e);
                  handleMouseUpLocal(e);
                }}
                onMouseLeave={(e) => {
                  handleMouseLeave(e);
                  handleMouseUpLocal(e);
                }}
                className={`max-w-full max-h-full transition-opacity duration-500 opacity-100`}
                style={{
                  cursor:
                    dragIndex !== null
                      ? "grabbing"
                      : hoveredIndex !== null
                        ? "grab"
                        : "crosshair",
                }}
              />
            </div>

            {/* Preview panel (side-by-side original / cropped / enhanced) */}
            {previewGenerated && (
              <div className="w-full md:w-1/3 flex flex-col items-center p-3 bg-white rounded shadow-sm relative">
                <div className="relative w-full flex items-center justify-center">
                  <div className="flex gap-3">
                    <div className="flex-1 flex flex-col items-center">
                      <div className="text-xs font-semibold mb-1">Original</div>
                      <OptimizedImage
                        src={originalPreview}
                        alt="Original"
                        className="w-full h-auto border-2 border-gray-300 rounded shadow-sm"
                        isPanning={isPanningRef.current}
                      />
                    </div>

                    {croppedPreview && (
                      <div className="flex-1 flex flex-col items-center">
                        <div className="text-xs font-semibold mb-1">
                          Recortada
                        </div>
                        <OptimizedImage
                          src={croppedPreview}
                          alt="Recortada"
                          className="w-full h-auto border-2 border-purple-400 rounded shadow-lg"
                          isPanning={isPanningRef.current}
                        />
                      </div>
                    )}

                    {(enhancedPreview || enhancementAvailable) &&
                      croppedPreview && (
                        <div className="flex-1 flex flex-col items-center relative">
                          <div className="text-xs font-semibold mb-1">
                            Mejorada
                          </div>
                          <OptimizedImage
                            src={enhancedPreview}
                            alt="Mejorada"
                            className="w-full h-auto border-2 border-green-400 rounded shadow-lg"
                            isPanning={isPanningRef.current}
                          />

                          {processingPreview && (
                            <div className="absolute inset-0 bg-black bg-opacity-40 flex items-center justify-center rounded">
                              <div className="text-center text-white">
                                <svg
                                  className="animate-spin h-8 w-8 mx-auto mb-2"
                                  xmlns="http://www.w3.org/2000/svg"
                                  fill="none"
                                  viewBox="0 0 24 24"
                                >
                                  <circle
                                    className="opacity-25"
                                    cx="12"
                                    cy="12"
                                    r="10"
                                    stroke="currentColor"
                                    strokeWidth="3"
                                  ></circle>
                                  <path
                                    className="opacity-75"
                                    fill="currentColor"
                                    d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                                  ></path>
                                </svg>
                                <div className="text-sm font-medium">
                                  Procesando...
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                  </div>
                </div>

                {/* Overlay controls: zoom level and reset */}
                <div className="absolute left-3 top-3 bg-white bg-opacity-80 px-2 py-1 rounded text-xs flex items-center gap-2">
                  <div>Vista previa del crop</div>
                </div>
                <p className="text-xs text-green-300 mt-2 font-medium">
                  ✓ Vista previa del crop enderezado
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="p-4 border-t border-gray-200 flex gap-3 justify-between items-center">
          <div className="flex-1 flex items-center gap-4">
            <div className="text-sm text-gray-700">
              Puntos:{" "}
              <span className="font-bold text-blue-600">
                {points.length} / 4
              </span>
            </div>
            {points.length === 4 && (
              <div className="text-xs text-green-600 font-medium">
                ✓ Listo para aplicar - Puedes arrastrar los puntos para ajustar
              </div>
            )}
          </div>
          <div className="flex gap-2">
            <button
              onClick={applyCrop}
              disabled={points.length !== 4}
              data-cy="boton-guardar-crop"
              className={`px-4 py-2 rounded-lg transition-colors ${
                points.length === 4
                  ? "bg-green-600 text-white hover:bg-green-700"
                  : "bg-gray-300 text-gray-500 cursor-not-allowed"
              }`}
              title="Guardar imagen recortada (usar versión mejorada si existe)"
            >
              💾 Guardar
            </button>
            <RestoreButton
              points={points}
              canvasRef={canvasRef}
              setErrorDeteccion={setErrorDeteccion}
              generatePreview={generatePreview}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default ManualVertexCropper;
