"use client"
import React, { useRef, useState, useEffect, useCallback } from 'react'
import SafeImage from '@/components/ui/SafeImage'

// Configuración del servicio de visión
const VISION_SERVICE_URL = process.env.NEXT_PUBLIC_VISION_SERVICE_URL || 'http://localhost:8000'

// Helper: solve 8x8 linear system via Gaussian elimination
function solveLinearSystem(A, b) {
  const n = A.length
  const M = A.map((row, i) => [...row, b[i]])

  for (let i = 0; i < n; i++) {
    // Pivot
    let maxRow = i
    for (let k = i + 1; k < n; k++) if (Math.abs(M[k][i]) > Math.abs(M[maxRow][i])) maxRow = k
    const tmp = M[i]; M[i] = M[maxRow]; M[maxRow] = tmp

    // Normalize
    const coef = M[i][i]
    if (Math.abs(coef) < 1e-12) continue
    for (let j = i; j <= n; j++) M[i][j] /= coef

    // Eliminate
    for (let k = 0; k < n; k++) if (k !== i) {
      const factor = M[k][i]
      for (let j = i; j <= n; j++) M[k][j] -= factor * M[i][j]
    }
  }
  return M.map(row => row[n])
}

// Compute homography from src quad to dst rect
function computeHomography(src, dst) {
  // src and dst are arrays of 4 points {x,y}
  // Solve for h (8 unknowns) using linear equations
  const A = []
  const b = []
  for (let i = 0; i < 4; i++) {
    const { x: x1, y: y1 } = src[i]
    const { x: x2, y: y2 } = dst[i]
    A.push([x1, y1, 1, 0, 0, 0, -x2 * x1, -x2 * y1])
    b.push(x2)
    A.push([0, 0, 0, x1, y1, 1, -y2 * x1, -y2 * y1])
    b.push(y2)
  }
  const h = solveLinearSystem(A, b)
  h.push(1)
  return h // 9 elements
}

function invertHomography(H) {
  // Invert 3x3 matrix H
  const a = H
  const m = [
    [a[0], a[1], a[2]],
    [a[3], a[4], a[5]],
    [a[6], a[7], a[8]]
  ]
  const det = (m[0][0]*m[1][1]*m[2][2] + m[0][1]*m[1][2]*m[2][0] + m[0][2]*m[1][0]*m[2][1]) - (m[0][2]*m[1][1]*m[2][0] + m[0][1]*m[1][0]*m[2][2] + m[0][0]*m[1][2]*m[2][1])
  if (Math.abs(det) < 1e-12) return null
  const inv = []
  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 3; j++) {
      const cofactor = (
        m[(j+1)%3][(i+1)%3]*m[(j+2)%3][(i+2)%3] - m[(j+1)%3][(i+2)%3]*m[(j+2)%3][(i+1)%3]
      )
      inv.push(cofactor / det)
    }
  }
  return inv
}

function bilinearSample(srcData, sx, sy, width, height) {
  const x = Math.floor(sx)
  const y = Math.floor(sy)
  const dx = sx - x
  const dy = sy - y
  const get = (xx, yy) => {
    if (xx < 0 || yy < 0 || xx >= width || yy >= height) return [0,0,0,0]
    const idx = (yy * width + xx) * 4
    return [srcData[idx], srcData[idx+1], srcData[idx+2], srcData[idx+3]]
  }
  const c00 = get(x,y)
  const c10 = get(x+1,y)
  const c01 = get(x,y+1)
  const c11 = get(x+1,y+1)
  const res = [0,0,0,0]
  for (let i =0;i<4;i++) {
    const v = c00[i]*(1-dx)*(1-dy) + c10[i]*dx*(1-dy) + c01[i]*(1-dx)*dy + c11[i]*dx*dy
    res[i] = v
  }
  return res
}

function ManualVertexCropper({ src, onCrop, onCancel }) {
  const canvasRef = useRef(null)
  const previewCanvasRef = useRef(null)
  // New: separate canvases for side-by-side comparison
  const origPreviewRef = useRef(null)
  const enhancedPreviewRef = useRef(null)
  const imgRef = useRef(null)
  const detectControllerRef = useRef(null)
  // For drawing a box by dragging (start point + drag to size)
  const rectStartRef = useRef(null)
  const drawingRectRef = useRef(false)
  // When we finish drawing a rect, the browser may emit a click event — suppress the next click
  const justDrawnRectRef = useRef(false)

  const [points, setPoints] = useState([]) // up to 4 [{x,y}]
  const [dragIndex, setDragIndex] = useState(null)
  const [hoveredIndex, setHoveredIndex] = useState(null)
  const [previewGenerated, setPreviewGenerated] = useState(false)
  const [detectando, setDetectando] = useState(false)
  const [errorDeteccion, setErrorDeteccion] = useState(null)
  // Enhanced image (restored) stored transiently when user runs 'Mejorar'
  const [enhancedFile, setEnhancedFile] = useState(null)
  const [enhancedPreview, setEnhancedPreview] = useState(null)
  const [debugInfo, setDebugInfo] = useState(null)
  const [yoloStatus, setYoloStatus] = useState(null)
  const tempDetectWidthRef = useRef(null)

  // Restore / enhancement status and logs
  const [restoreStatus, setRestoreStatus] = useState(null)
  const [restoreEvents, setRestoreEvents] = useState([])
  const [processingPreview, setProcessingPreview] = useState(false)
  const pushRestoreEvent = useCallback((msg) => {
    setRestoreEvents(prev => [{ ts: Date.now(), msg }, ...prev].slice(0,10))
    setRestoreStatus(msg)
  }, [])

  // Modal top position to place the modal below the IA header
  const [modalTop, setModalTop] = useState(48)
  useEffect(() => {
    // Fixed modal top so it always opens at the same position regardless of scroll
    setModalTop(64)

    // Fetch YOLO service status for enabling/disabling enhancement
    const fetchStatus = async () => {
      try {
        const res = await fetch(`${VISION_SERVICE_URL}/status`)
        if (!res.ok) {
          const d = await res.json().catch(()=>null)
          setYoloStatus(d || { ok: false, error: 'No response' })
        } else {
          const d = await res.json()
          setYoloStatus(d)
        }
      } catch (e) {
        setYoloStatus({ ok: false, error: String(e) })
      }
    }
    fetchStatus()

    // Prevent body scroll while modal is open
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    return () => {
      document.body.style.overflow = prevOverflow
    }
  }, [])

  // Abort any pending detection when the component unmounts
  useEffect(() => {
    return () => { try { detectControllerRef.current?.abort() } catch(e){} }
  }, [])

  const draw = useCallback(() => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d', { willReadFrequently: false })
    const img = imgRef.current
    if (!canvas || !ctx || !img) return
    
    // Optimización: usar requestAnimationFrame solo si es necesario
    ctx.clearRect(0,0,canvas.width,canvas.height)
    ctx.drawImage(img, 0,0,canvas.width,canvas.height)

    // draw polygon if points
    if (points.length > 0) {
      // Oscurecer todo (más suave)
      ctx.fillStyle = 'rgba(0,0,0,0.3)'
      ctx.fillRect(0,0,canvas.width,canvas.height)
      
      // Aclarar área seleccionada
      ctx.save()
      ctx.globalCompositeOperation = 'destination-out'
      ctx.beginPath()
      ctx.moveTo(points[0].x, points[0].y)
      for (let i =1;i<points.length;i++) ctx.lineTo(points[i].x, points[i].y)
      if (points.length ===4) ctx.closePath()
      ctx.fill()
      ctx.restore()

      // Si tenemos 4 puntos, ordenarlos para mostrar el polígono correcto
      let orderedPoints = [...points]
      if (points.length === 4) {
        // Ordenar por Y
        orderedPoints.sort((a, b) => a.y - b.y)
        const topPoints = orderedPoints.slice(0, 2).sort((a, b) => a.x - b.x)
        const bottomPoints = orderedPoints.slice(2, 4).sort((a, b) => a.x - b.x)
        orderedPoints = [topPoints[0], topPoints[1], bottomPoints[1], bottomPoints[0]] // TL, TR, BR, BL para polígono cerrado
      }

      // draw lines con polígono ordenado
      ctx.strokeStyle = '#3b82f6'
      ctx.lineWidth = 2
      ctx.shadowColor = '#3b82f6'
      ctx.shadowBlur = 4
      ctx.beginPath()
      ctx.moveTo(orderedPoints[0].x, orderedPoints[0].y)
      for (let i =1;i<orderedPoints.length;i++) ctx.lineTo(orderedPoints[i].x, orderedPoints[i].y)
      if (orderedPoints.length === 4) ctx.closePath()
      ctx.stroke()
      ctx.shadowBlur = 0

      // draw points originales con sus números
      for (let i=0;i<points.length;i++){
        const pt = points[i]
        const isHovered = hoveredIndex === i || dragIndex === i
        const radius = isHovered ? 18 : 12
        
        // Círculo blanco
        ctx.fillStyle = '#fff'
        ctx.strokeStyle = isHovered ? '#ef4444' : '#2563eb'
        ctx.lineWidth = isHovered ? 5 : 3
        ctx.beginPath()
        ctx.arc(pt.x, pt.y, radius, 0, Math.PI*2)
        ctx.fill()
        ctx.stroke()
        
        // Número
        ctx.fillStyle = isHovered ? '#ef4444' : '#2563eb'
        ctx.font = isHovered ? 'bold 14px sans-serif' : '12px sans-serif'
        const text = String(i+1)
        const metrics = ctx.measureText(text)
        ctx.fillText(text, pt.x - metrics.width/2, pt.y + 5)
      }
    }
  }, [points, hoveredIndex, dragIndex])

  useEffect(() => {
    const img = new Image()
    img.src = src
    img.onload = () => {
      imgRef.current = img
      const canvas = canvasRef.current
      const maxW = Math.min(window.innerWidth - 120, img.width)
      const scale = Math.min(maxW / img.width, 1)
      canvas.width = img.width * scale
      canvas.height = img.height * scale
      canvas.dataset.scale = scale
      draw()
    }
  }, [src, draw])

  useEffect(() => draw(), [points, draw, hoveredIndex, dragIndex])
  
  // Generar preview cuando tenemos 4 puntos
  const generatePreview = useCallback(() => {
    if (points.length !== 4) return
    
    const canvas = canvasRef.current
    const img = imgRef.current
    const scale = canvas.dataset.scale ? Number(canvas.dataset.scale) : 1

    // Convert canvas points back to original image coords
    let srcPts = points.map(p => ({ x: p.x / scale, y: p.y / scale }))

    // ORDENAR PUNTOS: Top-Left, Top-Right, Bottom-Left, Bottom-Right
    // 1. Ordenar por Y (arriba primero)
    srcPts.sort((a, b) => a.y - b.y)
    
    // 2. Los 2 primeros son top, los 2 últimos son bottom
    const topPoints = srcPts.slice(0, 2).sort((a, b) => a.x - b.x) // Ordenar por X
    const bottomPoints = srcPts.slice(2, 4).sort((a, b) => a.x - b.x)
    
    // 3. Asignar en orden: TL, TR, BL, BR
    srcPts = [
      topPoints[0],     // Top-Left
      topPoints[1],     // Top-Right
      bottomPoints[0],  // Bottom-Left
      bottomPoints[1]   // Bottom-Right
    ]

    // Destination rectangle size
    const dist = (a,b) => Math.hypot(a.x-b.x, a.y-b.y)
    const top = dist(srcPts[0], srcPts[1])
    const bottom = dist(srcPts[2], srcPts[3])
    const left = dist(srcPts[0], srcPts[2])
    const right = dist(srcPts[1], srcPts[3])
    const dstW = Math.round((top + bottom) / 2)
    const dstH = Math.round((left + right) / 2)

    // Destination rectangle points (ordenados: TL, TR, BL, BR)
    const dstPts = [ {x:0,y:0}, {x:dstW-1,y:0}, {x:0,y:dstH-1}, {x:dstW-1,y:dstH-1} ]

    const H = computeHomography(srcPts, dstPts)
    const invH = invertHomography(H)
    if (!invH) return

    // Create source imageData
    const tmpCanvas = document.createElement('canvas')
    tmpCanvas.width = img.width
    tmpCanvas.height = img.height
    const tctx = tmpCanvas.getContext('2d', { willReadFrequently: true })
    tctx.drawImage(img,0,0)
    const srcData = tctx.getImageData(0,0,tmpCanvas.width, tmpCanvas.height)

    // Create dest canvas for preview (original crop)
    const prevCanvas = origPreviewRef.current || previewCanvasRef.current
    if (!prevCanvas) return
    prevCanvas.width = dstW
    prevCanvas.height = dstH
    const dctx = prevCanvas.getContext('2d', { willReadFrequently: false })
    const dstImage = dctx.createImageData(dstW, dstH)

    // For each pixel in dst, map back to src via inverse homography
    const inv = invH
    for (let y = 0; y < dstH; y++) {
      for (let x = 0; x < dstW; x++) {
        const denom = inv[6]*x + inv[7]*y + inv[8]
        const sx = (inv[0]*x + inv[1]*y + inv[2]) / denom
        const sy = (inv[3]*x + inv[4]*y + inv[5]) / denom

        const color = bilinearSample(srcData.data, sx, sy, tmpCanvas.width, tmpCanvas.height)
        const idx = (y*dstW + x)*4
        dstImage.data[idx] = color[0]
        dstImage.data[idx+1] = color[1]
        dstImage.data[idx+2] = color[2]
        dstImage.data[idx+3] = color[3]
      }
    }

    dctx.putImageData(dstImage, 0, 0)

    // Ensure enhanced canvas matches size for side-by-side comparison (blank until enhanced result arrives)
    const enhCanvas = enhancedPreviewRef.current
    if (enhCanvas) {
      enhCanvas.width = dstW
      enhCanvas.height = dstH
      const ectx = enhCanvas.getContext('2d')
      ectx.clearRect(0,0,dstW,dstH)
      // optionally draw a faint overlay or 'No data' label — for now keep blank
    }
  }, [points])
  
  // Regenerar preview cuando se mueven los puntos (solo si está en modo comparación)
  useEffect(() => {
    if (points.length === 4 && previewGenerated) {
      const timeout = setTimeout(() => {
        generatePreview()
      }, dragIndex !== null ? 150 : 100) // Más delay si estamos arrastrando
      return () => clearTimeout(timeout)
    }
  }, [points, previewGenerated, generatePreview, dragIndex])

  function toCanvasCoords(clientX, clientY) {
    const canvas = canvasRef.current
    const rect = canvas.getBoundingClientRect()
    
    // Calcular coordenadas relativas al canvas visual
    const x = clientX - rect.left
    const y = clientY - rect.top
    
    // Convertir a coordenadas del canvas interno (considerando que el canvas puede estar escalado en el DOM)
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height
    
    return { 
      x: x * scaleX, 
      y: y * scaleY 
    }
  }

  function handleClick(e) {
    // Ignore click that immediately follows a rectangle drag
    if (justDrawnRectRef.current) {
      justDrawnRectRef.current = false
      return
    }

    // No agregar puntos si estamos arrastrando o acabamos de soltar
    if (dragIndex !== null) return
    if (points.length >= 4) return
    
    // Verificar que no estamos cerca de un punto existente (evitar click accidental)
    const p = toCanvasCoords(e.clientX, e.clientY)
    const nearPoint = points.findIndex(pt => Math.hypot(pt.x - p.x, pt.y - p.y) < 24)
    if (nearPoint >= 0) return // Si estamos cerca de un punto, no agregar nuevo
    
    setPoints(prev => [...prev, p])
  }

  function handleMouseDown(e) {
    const srcEv = e.touches ? e.touches[0] : e
    const p = toCanvasCoords(srcEv.clientX, srcEv.clientY)

    // check if clicking near existing point -> start dragging that point
    const idx = points.findIndex(pt => Math.hypot(pt.x - p.x, pt.y - p.y) < 28)
    if (idx >= 0) {
      e.preventDefault()
      e.stopPropagation()
      setDragIndex(idx)

      // Add window-level listeners to track pointer even if it leaves the canvas
      const onMove = (ev) => {
        const src = ev.touches ? ev.touches[0] : ev
        const q = toCanvasCoords(src.clientX, src.clientY)
        setPoints(prev => prev.map((pt, i) => i === idx ? q : pt))
      }
      const onUp = (ev) => {
        setDragIndex(null)
        window.removeEventListener('mousemove', onMove)
        window.removeEventListener('mouseup', onUp)
        window.removeEventListener('touchmove', onMove)
        window.removeEventListener('touchend', onUp)
      }
      window.addEventListener('mousemove', onMove)
      window.addEventListener('mouseup', onUp)
      window.addEventListener('touchmove', (t) => onMove(t.touches[0] || t), { passive: false })
      window.addEventListener('touchend', onUp)
      return
    }

    // If no existing points, start drawing a rectangle by dragging
    if (points.length === 0) {
      e.preventDefault()
      rectStartRef.current = p
      drawingRectRef.current = true

      const onMoveRect = (ev) => {
        const src = ev.touches ? ev.touches[0] : ev
        const q = toCanvasCoords(src.clientX, src.clientY)
        const left = Math.min(rectStartRef.current.x, q.x)
        const right = Math.max(rectStartRef.current.x, q.x)
        const top = Math.min(rectStartRef.current.y, q.y)
        const bottom = Math.max(rectStartRef.current.y, q.y)

        // Set points in order: TL, TR, BL, BR (keeps consistency with prev code)
        // Use TL, TR, BR, BL ordering to avoid self-intersecting polygon
        const rectPts = [ {x:left, y:top}, {x:right, y:top}, {x:right, y:bottom}, {x:left, y:bottom} ]
        setPoints(rectPts)
      }

      const onUpRect = (ev) => {
        drawingRectRef.current = false
        justDrawnRectRef.current = true // prevent subsequent click add
        // small timeout to allow potential click event suppression
        setTimeout(() => { justDrawnRectRef.current = false }, 250)

        window.removeEventListener('mousemove', onMoveRect)
        window.removeEventListener('mouseup', onUpRect)
        window.removeEventListener('touchmove', onMoveRect)
        window.removeEventListener('touchend', onUpRect)
      }

      window.addEventListener('mousemove', onMoveRect)
      window.addEventListener('mouseup', onUpRect)
      window.addEventListener('touchmove', onMoveRect, { passive: false })
      window.addEventListener('touchend', onUpRect)
    }
  }

  function handleMouseMove(e) {
    const p = toCanvasCoords(e.clientX, e.clientY)
    
    // Si estamos arrastrando
    if (dragIndex !== null) {
      setPoints(prev => prev.map((pt, i) => i === dragIndex ? p : pt))
      return
    }
    
    // Detectar hover
    const idx = points.findIndex(pt => Math.hypot(pt.x - p.x, pt.y - p.y) < 24)
    setHoveredIndex(idx >= 0 ? idx : null)
  }

  function handleMouseUp() { 
    setDragIndex(null) 
  }

  function handleMouseLeave() {
    setDragIndex(null)
    setHoveredIndex(null)
  }



  function reset() { 
    setPoints([])
    setPreviewGenerated(false)
    setErrorDeteccion(null)
  }


  // React component: RestoreButton - creates a preview crop (if needed), sends it to /api/yolo/restore
  function RestoreButton({ points, setErrorDeteccion, generatePreview }) {
    const [restoring, setRestoring] = useState(false) 

    const doRestore = async () => {
      if (points.length !== 4) return
      setErrorDeteccion(null)

      // Ensure preview exists
      if (!previewGenerated) {
        generatePreview()
        setPreviewGenerated(true)
        // wait a tick for preview canvas to be painted
        await new Promise(r => setTimeout(r, 120))
      }

      const prevCanvas = origPreviewRef.current || previewCanvasRef.current
      if (!prevCanvas) { setErrorDeteccion('No hay preview para restaurar'); return }

      setRestoring(true)
      try {
        await new Promise(r => setTimeout(r, 10)) // tiny pause
        const blob = await new Promise(resolve => prevCanvas.toBlob(resolve, 'image/jpeg', 0.95))
        if (!blob) throw new Error('No se pudo generar el blob del recorte')

        // Ensure backend service status
        let status = yoloStatus
        if (!status) {
          try {
            const sres = await fetch(`${VISION_SERVICE_URL}/status`)
            if (sres.ok) status = await sres.json()
            else status = { ok: false }
            setYoloStatus(status)
          } catch (e) {
            setErrorDeteccion('No se pudo contactar el servicio de restauración')
            pushRestoreEvent('Error: no se pudo contactar el servicio')
            setProcessingPreview(false)
            return
          }
        }
        if (!status.ok || !status.cv2_installed) {
          setErrorDeteccion('Servicio de restauración no disponible: faltan dependencias (opencv/numpy/pillow) o el servicio no responde.')
          pushRestoreEvent('Servicio no disponible')
          setProcessingPreview(false)
          return
        }

        const fd = new FormData()
        fd.append('image', blob, 'cropped.jpg')

        // Push event and show overlay
        pushRestoreEvent('Enviando imagen al servicio...')
        setProcessingPreview(true)

        const res = await fetch(`${VISION_SERVICE_URL}/restore`, { method: 'POST', body: fd })

        // Server received and is processing
        pushRestoreEvent('Servidor: imagen recibida, procesando...')

        const data = await res.json()
        if (!res.ok || !data.ok) {
          let reason = data.error || data.reason || 'Error al restaurar el documento'
          if (String(reason).toLowerCase().includes('missing python requirements')) {
            reason = `${reason} — Iniciá el microservicio YOLO y verificá dependencias (opencv, pillow, ultralytics, torch/docres).`
          }
          setErrorDeteccion(reason)
          pushRestoreEvent('Error: ' + reason)
          return
        }

        // Show restored image in the preview canvas
        if (data.restored_image_base64) {
          const img = new Image()
          img.onload = () => {
            const origCanvas = origPreviewRef.current || previewCanvasRef.current
            const enhCanvas = enhancedPreviewRef.current || previewCanvasRef.current
            if (!origCanvas || !enhCanvas) return

            // Ensure enhanced canvas matches original preview size for side-by-side
            enhCanvas.width = origCanvas.width
            enhCanvas.height = origCanvas.height
            const ctx = enhCanvas.getContext('2d')
            ctx.clearRect(0,0,enhCanvas.width, enhCanvas.height)
            // Draw server restored image scaled to match orig canvas
            ctx.drawImage(img, 0, 0, enhCanvas.width, enhCanvas.height)

            setPreviewGenerated(true)
            // Store enhanced preview and file (for saving when user accepts the crop)
            (async () => {
              try {
                const dataUrl = 'data:image/png;base64,' + data.restored_image_base64
                setEnhancedPreview(dataUrl)
                const blob = await (await fetch(dataUrl)).blob()
                const enhancedF = new File([blob], `enhanced-${Date.now()}.png`, { type: blob.type || 'image/png' })
                setEnhancedFile(enhancedF)
              } catch (e) {
                console.warn('No se pudo crear archivo de versión mejorada:', e)
                setEnhancedFile(null)
                setEnhancedPreview(null)
              }
            })()
            setDebugInfo(prev => ({ ...prev, restoredModel: data.model, restoredTimingMs: data.timing_ms, restoredParams: data.params }))
            if (data.fallback) {
              pushRestoreEvent('Se aplicó fallback conservador')
              setRestoreStatus('Se aplicó fallback conservador')
            } else {
              pushRestoreEvent('Restauración completada')
              setRestoreStatus('Restauración completada')
            }
            setErrorDeteccion(null)
          }
          img.src = 'data:image/png;base64,' + data.restored_image_base64
        }

      } catch (err) {
        console.error('Error restaurando:', err)
        setErrorDeteccion(String(err))
        pushRestoreEvent('Error: ' + String(err))
        // fallback to local enhancement
        await localEnhance()
      } finally {
        setRestoring(false)
        setProcessingPreview(false)
      }
    }

    return (
      <div className="flex gap-2">
        <button onClick={doRestore} disabled={points.length !== 4 || restoring} className={`min-w-[180px] whitespace-nowrap flex items-center justify-center px-4 py-2.5 rounded-lg border transition-all duration-300 ${restoring ? 'bg-gray-200 text-gray-500 cursor-not-allowed' : 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200'}`}>
          <span className="inline-flex items-center gap-2">
            {restoring && (
              <svg className="animate-spin h-4 w-4 text-yellow-800" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path></svg>
            )}
            <span className="inline-block">🧼 Restaurar documento</span>
          </span>
        </button>
      </div>
    )
  }


  const detectarAutomaticamente = async () => {
    setDetectando(true)
    setErrorDeteccion(null)

    try {
      const canvas = canvasRef.current
      if (!canvas) throw new Error('Canvas no disponible')

      // Abort controller for fetch
      detectControllerRef.current = new AbortController()
      const signal = detectControllerRef.current.signal

      // Fetch image blob from src
      const imgResp = await fetch(src)
      if (!imgResp.ok) throw new Error('No se pudo descargar la imagen')
      const blob = await imgResp.blob()

      const fd = new FormData()
      fd.append('image', blob, 'upload.jpg')

      const timeoutMs = 20000
      const timeout = setTimeout(() => { try { detectControllerRef.current?.abort() } catch(e){} }, timeoutMs)

      // Call Docker YOLO service
      const res = await fetch(`${VISION_SERVICE_URL}/detect`, { method: 'POST', body: fd, signal })
      clearTimeout(timeout)

      if (!res.ok) {
        let err = { error: 'Unknown error' }
        try { err = await res.json() } catch { err = { error: await res.text().catch(()=>'') } }
        setErrorDeteccion(err.reason || err.error || String(err))
        return
      }

      const data = await res.json()
      if (!data.ok) {
        // If YOLO/opencv failed to find a document, select full image for manual editing
        // BUT preserve user's existing selection if they already moved points
        setErrorDeteccion(data.reason || data.error || 'No se detectó un documento')
        // Ignorar imagen de debug de selección (ya no se muestra)
        const canvas = canvasRef.current
        if (canvas && points.length === 0) {
          const full = [ {x:0,y:0}, {x:canvas.width,y:0}, {x:canvas.width,y:canvas.height}, {x:0,y:canvas.height} ]
          setPoints(full)
          setPreviewGenerated(false)
        }
        return
      }

      // data.points are absolute pixels
      const scale = canvas.dataset.scale ? Number(canvas.dataset.scale) : 1
      const mapped = (data.points || []).map(p => ({ x: Math.round(p.x * scale), y: Math.round(p.y * scale) }))
      if (mapped.length === 4) {
        setPoints(mapped)
        // No guardamos ni mostramos imágenes de depuración de selección
        setErrorDeteccion(null)
      } else {
        setErrorDeteccion('Respuesta inválida del servicio YOLO')
      }
    } catch (err) {
      if (err.name === 'AbortError') setErrorDeteccion('Detección cancelada')
      else { console.error('Error detectando:', err); setErrorDeteccion(String(err)) }
    } finally {
      setDetectando(false)
      if (detectControllerRef.current) detectControllerRef.current = null
    }
  }

  // Header-level enhancement control (used by the header button)
  const [enhancingHeader, setEnhancingHeader] = useState(false)
  const enhanceDocumentHeader = async () => {
    setErrorDeteccion(null)

    // If there are no points, auto-select the full image and proceed
    if (points.length !== 4) {
      if (points.length === 0) {
        const canvas = canvasRef.current
        if (!canvas) { setErrorDeteccion('Canvas no disponible'); return }
        const fullPts = [ {x:0,y:0}, {x:canvas.width,y:0}, {x:canvas.width,y:canvas.height}, {x:0,y:canvas.height} ]
        setPoints(fullPts)
        setPreviewGenerated(false)
        // Give time for preview generation
        await new Promise(r => setTimeout(r, 120))
      } else {
        // Partial selection: ask user to complete or use Enfocar Documento
        setErrorDeteccion('Por favor seleccioná 4 vértices o ejecutá "Enfocar Documento" antes de mejorar')
        return
      }
    }

    // Ensure preview exists
    if (!previewGenerated) {
      generatePreview()
      setPreviewGenerated(true)
      await new Promise(r => setTimeout(r, 160))
    }

    const prevCanvas = origPreviewRef.current || previewCanvasRef.current
    if (!prevCanvas) { setErrorDeteccion('No hay preview para mejorar'); return }

    setEnhancingHeader(true)
    try {
      const blob = await new Promise(resolve => prevCanvas.toBlob(resolve, 'image/jpeg', 0.95))
      if (!blob) throw new Error('No se pudo generar el blob del recorte')

      const fd = new FormData()
      fd.append('image', blob, 'cropped.jpg')
      fd.append('enhance', '1')

      // Agregar parámetros de mejora desde localStorage
      let sentParams = {}
      try {
        const params = localStorage.getItem('imageEnhancementParams')
        if (params) {
          const parsed = JSON.parse(params)
          sentParams = parsed
          if (parsed.clahe_clip !== undefined) fd.append('clahe_clip', parsed.clahe_clip)
          if (parsed.kernel_size !== undefined) fd.append('kernel_size', parsed.kernel_size)
          if (parsed.shadow_threshold !== undefined) fd.append('shadow_threshold', parsed.shadow_threshold)
          if (parsed.brightness_boost !== undefined) fd.append('brightness_boost', parsed.brightness_boost)
          if (parsed.denoise_strength !== undefined) fd.append('denoise_strength', parsed.denoise_strength)
          if (parsed.sharpen_amount !== undefined) fd.append('sharpen_amount', parsed.sharpen_amount)
          if (parsed.contrast_boost !== undefined) fd.append('contrast_boost', parsed.contrast_boost)
        }
      } catch (e) {
        console.warn('No se pudieron cargar parámetros de mejora:', e)
      }

      // Push event + overlay
      pushRestoreEvent('Enviando imagen al servicio...')
      if (Object.keys(sentParams).length > 0) {
        pushRestoreEvent('Parámetros enviados: ' + JSON.stringify(sentParams))
        setDebugInfo(prev => ({ ...prev, sentParams }))
      }
      setProcessingPreview(true)

      const res = await fetch(`${VISION_SERVICE_URL}/restore`, { method: 'POST', body: fd })

      pushRestoreEvent('Servidor: imagen recibida, procesando...')

      const data = await res.json()
      if (!res.ok || !data.ok) {
        // Show specific reason when available and add actionable hint for missing deps
        let reason = data?.error || data?.reason || 'Error mejorando el documento'
        if (String(reason).toLowerCase().includes('missing python requirements') || String(reason).toLowerCase().includes('missing')) {
          reason = `${reason} — El servicio de mejora no está disponible. Iniciá el microservicio YOLO en el servidor (verificar dependencias: opencv, pillow, ultralytics, torch/docres si usás DocRes).`
        }
        setErrorDeteccion(reason)
        pushRestoreEvent('Error: ' + reason)
        setProcessingPreview(false)
        return
      }

        if (data.restored_image_base64) {
        const img = new Image()
        img.onload = () => {
          const origCanvas = origPreviewRef.current || previewCanvasRef.current
          const enhCanvas = enhancedPreviewRef.current || previewCanvasRef.current
          if (!origCanvas || !enhCanvas) return

          enhCanvas.width = origCanvas.width
          enhCanvas.height = origCanvas.height
          const ctx = enhCanvas.getContext('2d')
          ctx.clearRect(0,0,enhCanvas.width, enhCanvas.height)
          ctx.drawImage(img, 0, 0, enhCanvas.width, enhCanvas.height)

          setPreviewGenerated(true)
          // Store enhanced preview and file for later saving
          (async () => {
            try {
              const dataUrl = 'data:image/png;base64,' + data.restored_image_base64
              setEnhancedPreview(dataUrl)
              const blob = await (await fetch(dataUrl)).blob()
              const enhancedF = new File([blob], `enhanced-${Date.now()}.png`, { type: blob.type || 'image/png' })
              setEnhancedFile(enhancedF)
            } catch (e) {
              console.warn('No se pudo crear archivo de versión mejorada:', e)
            }
          })()
          setDebugInfo(prev => ({ ...prev, restoredModel: data.model, restoredTimingMs: data.timing_ms, restoredParams: data.params }))
          if (data.fallback) {
            pushRestoreEvent('Se aplicó fallback conservador')
            setRestoreStatus('Se aplicó fallback conservador')
          } else {
            pushRestoreEvent('Restauración completada')
            setRestoreStatus('Restauración completada')
          }
          setErrorDeteccion(null)
          setProcessingPreview(false)
        }
        img.src = 'data:image/png;base64,' + data.restored_image_base64
      } else if (data.ok === false && data.error) {
        // If backend is missing, attempt local enhancement fallback
        console.warn('Backend restore failed, reason:', data.error)
        // Run local canvas-based enhancement as fallback
        await localEnhance()
      }

    } catch (err) {
      console.error('Error mejorando (header):', err)
      setErrorDeteccion(String(err))
      pushRestoreEvent('Error: ' + String(err))
      setProcessingPreview(false)
    } finally {
      setEnhancingHeader(false)
      setProcessingPreview(false)
    }
  }

  // Local client-side enhancement fallback (canvas-based)
  async function localEnhance() {
    setErrorDeteccion(null)
    const start = performance.now()
    if (!previewGenerated) {
      generatePreview()
      setPreviewGenerated(true)
      await new Promise(r => setTimeout(r, 120))
    }
    const orig = origPreviewRef.current || previewCanvasRef.current
    const enh = enhancedPreviewRef.current || previewCanvasRef.current
    if (!orig || !enh) { setErrorDeteccion('No hay preview para mejorar'); return }

    // Work on a temporary canvas (scale down for speed)
    const maxW = 800
    const w = orig.width
    const h = orig.height
    const scale = Math.min(1, maxW / w)
    const tw = Math.max(1, Math.round(w * scale))
    const th = Math.max(1, Math.round(h * scale))

    const tmp = document.createElement('canvas')
    tmp.width = tw
    tmp.height = th
    const tctx = tmp.getContext('2d')
    tctx.drawImage(orig, 0, 0, tw, th)


    let imgData = tctx.getImageData(0,0,tw,th)
    const data = imgData.data

    // Simple enhancement: brighten darks (gamma-like), mild contrast, and unsharp-ish
    // Convert to float and process
    const gammaBoost = 1.12
    for (let i = 0; i < data.length; i += 4) {
      // RGB -> normalize
      let r = data[i] / 255
      let g = data[i+1] / 255
      let b = data[i+2] / 255
      // luminance
      const L = 0.2126*r + 0.7152*g + 0.0722*b
      if (L < 0.6) {
        // boost darker regions slightly
        const factor = 1 + (0.6 - L) * 0.35
        r = Math.min(1, Math.pow(r * factor, 1 / 1.05))
        g = Math.min(1, Math.pow(g * factor, 1 / 1.05))
        b = Math.min(1, Math.pow(b * factor, 1 / 1.05))
      }
      // apply gamma-ish global lift
      r = Math.min(1, Math.pow(r, 1 / gammaBoost))
      g = Math.min(1, Math.pow(g, 1 / gammaBoost))
      b = Math.min(1, Math.pow(b, 1 / gammaBoost))

      // contrast stretch
      r = Math.min(1, Math.max(0, (r - 0.5) * 1.06 + 0.5))
      g = Math.min(1, Math.max(0, (g - 0.5) * 1.06 + 0.5))
      b = Math.min(1, Math.max(0, (b - 0.5) * 1.06 + 0.5))

      data[i] = Math.round(r * 255)
      data[i+1] = Math.round(g * 255)
      data[i+2] = Math.round(b * 255)
    }

    // mild box blur for smoothing (3x3 pass)
    function boxBlur(srcData, w, h) {
      const out = new Uint8ClampedArray(srcData.length)
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          let r=0,g=0,b=0,cnt=0
          for (let oy=-1; oy<=1; oy++) for (let ox=-1; ox<=1; ox++) {
            const nx = x+ox, ny = y+oy
            if (nx>=0 && nx<w && ny>=0 && ny<h) {
              const idx = (ny*w + nx)*4
              r += srcData[idx]; g += srcData[idx+1]; b += srcData[idx+2]; cnt++
            }
          }
          const idx = (y*w + x)*4
          out[idx] = Math.round(r/cnt)
          out[idx+1] = Math.round(g/cnt)
          out[idx+2] = Math.round(b/cnt)
          out[idx+3] = srcData[idx+3]
        }
      }
      return out
    }

    const blurred = boxBlur(data, tw, th)
    // Blend unsharp: final = orig*0.88 + blurred*0.12
    for (let i = 0; i < data.length; i += 4) {
      data[i] = Math.round(data[i]*0.88 + blurred[i]*0.12)
      data[i+1] = Math.round(data[i+1]*0.88 + blurred[i+1]*0.12)
      data[i+2] = Math.round(data[i+2]*0.88 + blurred[i+2]*0.12)
    }

    tctx.putImageData(imgData, 0, 0)

    // Draw local enhancement into enhanced canvas scaled to orig size
    enh.width = w
    enh.height = h
    const enhCtx = enh.getContext('2d')
    enhCtx.clearRect(0,0,w,h)
    enhCtx.drawImage(tmp, 0, 0, tw, th, 0, 0, w, h)

    const png = enh.toDataURL('image/png')
    // Save local enhancement result as enhanced preview/file
    (async () => {
      try {
        setEnhancedPreview(png)
        const blob = await (await fetch(png)).blob()
        const enhancedF = new File([blob], `enhanced-local-${Date.now()}.png`, { type: blob.type || 'image/png' })
        setEnhancedFile(enhancedF)
      } catch (e) {
        console.warn('No se pudo crear archivo de versión mejorada local:', e)
      }
    })()
    const elapsed = Math.round(performance.now() - start)
    setDebugInfo(prev => ({ ...prev, restoredModel: 'local_fallback', restoredTimingMs: elapsed }))
    setErrorDeteccion(null)
  }

  async function applyCrop() {
    if (points.length !== 4) {
      alert('Por favor selecciona 4 vértices antes de aplicar el recorte')
      return
    }
    const canvas = canvasRef.current
    const img = imgRef.current
    const scale = canvas.dataset.scale ? Number(canvas.dataset.scale) : 1

    // Convert canvas points back to original image coords
    let srcPts = points.map(p => ({ x: p.x / scale, y: p.y / scale }))

    // ORDENAR PUNTOS: Top-Left, Top-Right, Bottom-Left, Bottom-Right
    // 1. Ordenar por Y (arriba primero)
    srcPts.sort((a, b) => a.y - b.y)
    
    // 2. Los 2 primeros son top, los 2 últimos son bottom
    const topPoints = srcPts.slice(0, 2).sort((a, b) => a.x - b.x) // Ordenar por X
    const bottomPoints = srcPts.slice(2, 4).sort((a, b) => a.x - b.x)
    
    // 3. Asignar en orden: TL, TR, BL, BR
    srcPts = [
      topPoints[0],     // Top-Left
      topPoints[1],     // Top-Right
      bottomPoints[0],  // Bottom-Left
      bottomPoints[1]   // Bottom-Right
    ]

    // Destination rectangle size: calculate width as average top and bottom edge lengths, height as average left/right
    const dist = (a,b) => Math.hypot(a.x-b.x, a.y-b.y)
    const top = dist(srcPts[0], srcPts[1])
    const bottom = dist(srcPts[2], srcPts[3])
    const left = dist(srcPts[0], srcPts[2])
    const right = dist(srcPts[1], srcPts[3])
    const dstW = Math.round((top + bottom) / 2)
    const dstH = Math.round((left + right) / 2)

    // Destination rectangle points (ordenados: TL, TR, BL, BR)
    const dstPts = [ {x:0,y:0}, {x:dstW-1,y:0}, {x:0,y:dstH-1}, {x:dstW-1,y:dstH-1} ]

    const H = computeHomography(srcPts, dstPts)
    const invH = invertHomography(H)
    if (!invH) { alert('No se pudo calcular la homografía'); return }

    // Create source imageData
    const tmpCanvas = document.createElement('canvas')
    tmpCanvas.width = img.width
    tmpCanvas.height = img.height
    const tctx = tmpCanvas.getContext('2d')
    tctx.drawImage(img,0,0)
    const srcData = tctx.getImageData(0,0,tmpCanvas.width, tmpCanvas.height)

    // Create dest canvas
    const dstCanvas = document.createElement('canvas')
    dstCanvas.width = dstW
    dstCanvas.height = dstH
    const dctx = dstCanvas.getContext('2d')
    const dstImage = dctx.createImageData(dstW, dstH)

    // For each pixel in dst, map back to src via inverse homography
    const inv = invH
    for (let y = 0; y < dstH; y++) {
      for (let x = 0; x < dstW; x++) {
        const denom = inv[6]*x + inv[7]*y + inv[8]
        const sx = (inv[0]*x + inv[1]*y + inv[2]) / denom
        const sy = (inv[3]*x + inv[4]*y + inv[5]) / denom

        const color = bilinearSample(srcData.data, sx, sy, tmpCanvas.width, tmpCanvas.height)
        const idx = (y*dstW + x)*4
        dstImage.data[idx] = color[0]
        dstImage.data[idx+1] = color[1]
        dstImage.data[idx+2] = color[2]
        dstImage.data[idx+3] = color[3]
      }
    }

    dctx.putImageData(dstImage, 0, 0)

    // Convert to blob and return File con la imagen croppeada
    dstCanvas.toBlob(async (blob) => {
      const croppedFile = new File([blob], `cropped-${Date.now()}.jpg`, { type: 'image/jpeg' })
      const croppedPreview = URL.createObjectURL(blob)
      
      // También convertir la imagen original a File
      const originalCanvas = document.createElement('canvas')
      originalCanvas.width = img.width
      originalCanvas.height = img.height
      const octx = originalCanvas.getContext('2d')
      octx.drawImage(img, 0, 0)
      
      originalCanvas.toBlob(async (originalBlob) => {
        const originalFile = new File([originalBlob], `original-${Date.now()}.jpg`, { type: 'image/jpeg' })
        const originalPreview = URL.createObjectURL(originalBlob)

        // Si hay una versión mejorada generada por la acción de 'Mejorar', anexarla
        const payload = {
          cropped: { file: croppedFile, preview: croppedPreview },
          original: { file: originalFile, preview: originalPreview }
        }
        if (enhancedFile && enhancedPreview) {
          payload.enhanced = { file: enhancedFile, preview: enhancedPreview }
        }

        onCrop(payload)
      }, 'image/jpeg', 0.95)
    }, 'image/jpeg', 0.95)
  }

  return (
    <div className="fixed left-0 right-0 bg-black bg-opacity-90 z-50 flex items-start justify-center" style={{ top: modalTop + 'px', maxHeight: `calc(100vh - ${modalTop}px - 16px)` }} >
      <div className="bg-white rounded-xl shadow-2xl w-[95vw] h-[95vh] flex flex-col">
        <div className="p-4 border-b border-gray-200 flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-lg text-gray-900">✂️ Crop manual (4 vértices)</h3>
            <p className="text-sm text-gray-600 mt-1">
              {points.length < 4 
                ? 'Usa detección automática o haz click 4 veces para marcar los vértices del documento'
                : '¡Perfecto! Ahora puedes arrastrar los puntos para ajustar o ver la previsualización'}
            </p>
            {/* Reserve vertical space for error messages to avoid layout shift */}
            <p className="text-xs text-yellow-600 mt-1 font-medium min-h-[20px]" role="status" aria-live="polite">
              {errorDeteccion ? `⚠️ ${errorDeteccion}` : ''}
            </p>

            {/* Single-line status (sequential messages only, replaces error display) */}
            <p className="text-xs text-yellow-600 mt-1 font-medium min-h-[20px]" role="status" aria-live="polite">
              {restoreStatus ? `ℹ️ ${restoreStatus}` : (errorDeteccion ? `⚠️ ${errorDeteccion}` : '')}
            </p>
          </div>
          <div className="flex gap-2">
              <button
                onClick={detectarAutomaticamente}
                disabled={detectando}
                className={`min-w-[180px] whitespace-nowrap flex items-center justify-center px-4 py-2.5 rounded-lg border transition-all duration-300 ${detectando ? 'bg-gray-200 text-gray-400 cursor-not-allowed' : 'bg-purple-600 text-white border-purple-600 hover:bg-purple-700 shadow-lg'}`}
              >
                <span className="inline-flex items-center gap-2">
                  {detectando && (
                    <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path></svg>
                  )}
                  <span className="inline-block">🔍 Enfocar Documento</span>
                </span>
              </button>

              <button
                onClick={enhanceDocumentHeader}
                className={`min-w-[180px] whitespace-nowrap flex items-center justify-center px-4 py-2.5 rounded-lg border transition-all duration-300 ${enhancingHeader ? 'bg-gray-200 text-gray-400 cursor-not-allowed' : 'bg-indigo-600 text-white border-indigo-600 hover:bg-indigo-700 shadow-lg'}`}
                disabled={enhancingHeader}
                title={yoloStatus && !yoloStatus.ok ? (yoloStatus.error || 'Servicio de mejora no disponible') : ''}
              >
                <span className="inline-flex items-center gap-2">
                  {enhancingHeader && (
                    <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path></svg>
                  )}
                  <span className="inline-block">✨ Mejorar documento</span>
                </span>
              </button>

            <button onClick={reset} className="px-3 py-1.5 rounded-lg border bg-gray-50 hover:bg-gray-100">🔄 Reset</button>
            <button onClick={onCancel} className="px-3 py-1.5 rounded-lg border bg-red-50 text-red-700 hover:bg-red-100">✖ Cancelar</button>
          </div>
        </div>

        <div className="flex-1 overflow-auto p-4">
          <div className="relative bg-gray-900 rounded-lg flex flex-col md:flex-row items-start justify-center gap-4" style={{ minHeight: '400px' }}>
            {/* Main canvas area */}
            <div className="flex-1 flex items-center justify-center p-2">
              <canvas
                ref={canvasRef}
                onClick={handleClick}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseLeave}
                className={`max-w-full max-h-full transition-opacity duration-500 opacity-100`}
                style={{ cursor: dragIndex !== null ? 'grabbing' : hoveredIndex !== null ? 'grab' : 'crosshair' }}
              />
            </div>

            {/* Preview panel (side-by-side original / enhanced) */}
            {previewGenerated && (
              <div className="w-full md:w-1/3 flex flex-col items-center p-3 bg-white rounded shadow-sm relative">
                <div className="relative w-full">
                  <div className="flex gap-3">
                    <div className="flex-1 flex flex-col items-center">
                      <div className="text-xs font-semibold mb-1">Original</div>
                      <canvas ref={origPreviewRef} className="w-full h-auto border-2 border-gray-300 rounded shadow-sm" />
                    </div>

                    <div className="flex-1 flex flex-col items-center relative">
                      <div className="text-xs font-semibold mb-1">Mejorada</div>
                      <canvas ref={enhancedPreviewRef} className="w-full h-auto border-2 border-green-400 rounded shadow-lg" />

                      {processingPreview && (
                        <div className="absolute right-0 top-6 w-1/2 h-[calc(100%-1.5rem)] bg-black bg-opacity-40 flex items-center justify-center rounded">
                          <div className="text-center text-white">
                            <svg className="animate-spin h-8 w-8 mx-auto mb-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path></svg>
                            <div className="text-sm font-medium">Procesando...</div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                <p className="text-xs text-green-300 mt-2 font-medium">✓ Vista previa del crop enderezado</p>
              </div>
            )}


          </div>
        </div>

        <div className="p-4 border-t border-gray-200 flex gap-3 justify-between items-center">
          <div className="flex-1 flex items-center gap-4">
            <div className="text-sm text-gray-700">
              Puntos: <span className="font-bold text-blue-600">{points.length} / 4</span>
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
              className={`px-4 py-2 rounded-lg transition-colors ${
                points.length === 4
                  ? 'bg-blue-600 text-white hover:bg-blue-700'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
            >
              ✂️ Aplicar crop y continuar
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
  )
}

export default ManualVertexCropper

