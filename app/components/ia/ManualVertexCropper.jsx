"use client"
import React, { useRef, useState, useEffect, useCallback } from 'react'
import SafeImage from '@/components/ui/SafeImage'

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

export default function ManualVertexCropper({ src, onCrop, onCancel }) {
  const canvasRef = useRef(null)
  const previewCanvasRef = useRef(null)
  const imgRef = useRef(null)
  const detectControllerRef = useRef(null)
  const [points, setPoints] = useState([]) // up to 4 [{x,y}]
  const [dragIndex, setDragIndex] = useState(null)
  const [hoveredIndex, setHoveredIndex] = useState(null)
  const [comparingMode, setComparingMode] = useState(false) // false = original, true = croppeada
  const [previewGenerated, setPreviewGenerated] = useState(false)
  const [detectando, setDetectando] = useState(false)
  const [errorDeteccion, setErrorDeteccion] = useState(null)
  const [debugImage, setDebugImage] = useState(null)
  const [debugInfo, setDebugInfo] = useState(null)
  const [debugDims, setDebugDims] = useState({ w: 300, h: 200 })
  const tempDetectWidthRef = useRef(null)

  // Modal top position to place the modal below the IA header
  const [modalTop, setModalTop] = useState(48)
  useEffect(() => {
    const computeTop = () => {
      const header = document.querySelector('.ia-control-header')
      if (header) {
        const r = header.getBoundingClientRect()
        // Align modal top with the top of the IA control banner (small downward offset not necessary)
        setModalTop(Math.round(r.top))
      } else {
        setModalTop(64)
      }
    }
    computeTop()
    window.addEventListener('resize', computeTop)
    window.addEventListener('scroll', computeTop, true)

    // Prevent body scroll while modal is open
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    return () => {
      window.removeEventListener('resize', computeTop)
      window.removeEventListener('scroll', computeTop, true)
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
      // Oscurecer todo
      ctx.fillStyle = 'rgba(0,0,0,0.5)'
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

    // Create dest canvas for preview
    const prevCanvas = previewCanvasRef.current
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
    const p = toCanvasCoords(e.clientX, e.clientY)
    // check if clicking near existing point
    const idx = points.findIndex(pt => Math.hypot(pt.x - p.x, pt.y - p.y) < 28)
    if (idx >= 0) {
      e.preventDefault()
      e.stopPropagation()
      setDragIndex(idx)

      // Add window-level listeners to track pointer even if it leaves the canvas
      const onMove = (ev) => {
        const q = toCanvasCoords(ev.clientX, ev.clientY)
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
    setComparingMode(false)
    setPreviewGenerated(false)
    setErrorDeteccion(null)
  }

  const toggleCompare = () => {
    if (!previewGenerated && points.length === 4) {
      generatePreview()
      setPreviewGenerated(true)
    }
    setComparingMode(!comparingMode)
  }

  // React component: RestoreButton - creates a preview crop (if needed), sends it to /api/yolo/restore
  function RestoreButton({ points, previewCanvasRef, setPreviewGenerated, setDebugImage, setErrorDeteccion, generatePreview }) {
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

      const prevCanvas = previewCanvasRef.current
      if (!prevCanvas) { setErrorDeteccion('No hay preview para restaurar'); return }

      setRestoring(true)
      try {
        await new Promise(r => setTimeout(r, 10)) // tiny pause
        const blob = await new Promise(resolve => prevCanvas.toBlob(resolve, 'image/jpeg', 0.95))
        if (!blob) throw new Error('No se pudo generar el blob del recorte')

        const fd = new FormData()
        fd.append('image', blob, 'cropped.jpg')

        const res = await fetch('/api/yolo/restore', { method: 'POST', body: fd })
        const data = await res.json()
        if (!res.ok || !data.ok) {
          setErrorDeteccion(data.error || data.reason || 'Error al restaurar el documento')
          return
        }

        // Show restored image in the preview canvas
        if (data.restored_image_base64) {
          const img = new Image()
          img.onload = () => {
            const pc = previewCanvasRef.current
            if (!pc) return
            pc.width = img.width
            pc.height = img.height
            const ctx = pc.getContext('2d')
            ctx.clearRect(0,0,pc.width, pc.height)
            ctx.drawImage(img, 0, 0)
            setPreviewGenerated(true)
            setDebugImage('data:image/png;base64,' + data.restored_image_base64)
            setErrorDeteccion(null)
          }
          img.src = 'data:image/png;base64,' + data.restored_image_base64
        }

      } catch (err) {
        console.error('Error restaurando:', err)
        setErrorDeteccion(String(err))
      } finally {
        setRestoring(false)
      }
    }

    return (
      <button onClick={doRestore} disabled={points.length !== 4 || restoring} className={`px-3 py-1.5 rounded-lg border transition-all duration-300 ${restoring ? 'bg-gray-200 text-gray-500 cursor-not-allowed' : 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200'}`}>
        {restoring ? '🧼 Restaurando...' : '🧼 Restaurar documento'}
      </button>
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

      // Call local YOLO service
      const res = await fetch('/api/yolo/detect-corners', { method: 'POST', body: fd, signal })
      clearTimeout(timeout)

      if (!res.ok) {
        let err = { error: 'Unknown error' }
        try { err = await res.json() } catch { err = { error: await res.text().catch(()=>'') } }
        setErrorDeteccion(err.reason || err.error || String(err))
        return
      }

      const data = await res.json()
      if (!data.ok) {
        setErrorDeteccion(data.reason || data.error || 'No se detectó un documento')
        if (data.debug_image_base64) setDebugImage('data:image/png;base64,'+data.debug_image_base64)
        return
      }

      // data.points are absolute pixels
      const scale = canvas.dataset.scale ? Number(canvas.dataset.scale) : 1
      const mapped = (data.points || []).map(p => ({ x: Math.round(p.x * scale), y: Math.round(p.y * scale) }))
      if (mapped.length === 4) {
        setPoints(mapped)
        if (data.debug_image_base64) setDebugImage('data:image/png;base64,' + data.debug_image_base64)
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
        
        // Retornar ambas imágenes
        onCrop({
          cropped: { file: croppedFile, preview: croppedPreview },
          original: { file: originalFile, preview: originalPreview }
        })
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
            {errorDeteccion && (
              <p className="text-xs text-yellow-600 mt-1 font-medium">
                ⚠️ {errorDeteccion}
              </p>
            )}
          </div>
          <div className="flex gap-2">
              <button
                onClick={detectarAutomaticamente}
                disabled={detectando}
                className={`px-4 py-2 rounded-lg border transition-all duration-300 ${detectando ? 'bg-gray-200 text-gray-400 cursor-not-allowed' : 'bg-purple-600 text-white border-purple-600 hover:bg-purple-700 shadow-lg'}`}
              >
                {detectando ? '⏳ Detectando...' : '🤖 Detectar automáticamente'}
              </button>
            {points.length === 4 && (
              <button 
                onClick={toggleCompare} 
                className={`px-3 py-1.5 rounded-lg border transition-all duration-300 ${
                  comparingMode
                    ? 'bg-green-600 text-white border-green-600 shadow-lg' 
                    : 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100'
                }`}
              >
                🔄 {comparingMode ? 'Ver original' : 'Comparar crop'}
              </button>
            )}
            <button onClick={reset} className="px-3 py-1.5 rounded-lg border bg-gray-50 hover:bg-gray-100">🔄 Reset</button>
            <button onClick={onCancel} className="px-3 py-1.5 rounded-lg border bg-red-50 text-red-700 hover:bg-red-100">✖ Cancelar</button>
          </div>
        </div>

        <div className="flex-1 overflow-auto p-4">
          <div className="relative bg-gray-900 rounded-lg flex flex-col justify-center items-center" style={{ minHeight: '400px' }}>
            {/* Canvas original con overlay de selección */}
            <canvas
              ref={canvasRef}
              onClick={handleClick}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseLeave}
              className={`max-w-full max-h-full transition-opacity duration-500 ${
                previewGenerated && comparingMode ? 'opacity-0 absolute inset-0' : 'opacity-100'
              }`}
              style={{ cursor: dragIndex !== null ? 'grabbing' : hoveredIndex !== null ? 'grab' : 'crosshair' }}
            />
            
            {/* Canvas preview croppeada (solo visible en modo comparación) */}
            {previewGenerated && (
              <div className={`flex flex-col items-center justify-center transition-opacity duration-500 ${
                comparingMode ? 'opacity-100' : 'opacity-0 absolute inset-0 pointer-events-none'
              }`}>
                <canvas
                  ref={previewCanvasRef}
                  className="max-w-full max-h-full border-2 border-green-400 rounded shadow-lg"
                />
                <p className="text-xs text-green-300 mt-2 font-medium">✓ Vista previa del crop enderezado</p>
              </div>
            )}
            
            {/* Indicador de vista activa */}
            {previewGenerated && (
              <div className="absolute top-4 right-4 px-3 py-1.5 rounded-lg font-medium text-xs shadow-lg">
                <div className={`transition-all duration-300 ${
                  comparingMode 
                    ? 'bg-green-600 text-white' 
                    : 'bg-blue-600 text-white'
                }`}>
                  {comparingMode ? '📸 Croppeada' : '🖼️ Original'}
                </div>
              </div>
            )}

            {/* Debug image from worker (if available) */}
            {debugImage && (
              <div className="absolute right-4 top-16 p-2 bg-black bg-opacity-70 rounded">
                <div className="text-xs text-white font-medium mb-1">Debug detección</div>
                <div className="w-48 h-auto border inline-block">
                  <SafeImage src={debugImage} alt="debug" width={Math.min(480, debugDims.w)} height={Math.round(Math.min(480, debugDims.w) * (debugDims.h / debugDims.w || 0.66))} unoptimized className="rounded-sm" />
                </div>
                {debugInfo && (
                  <div className="text-xs text-gray-200 mt-1">Contours: {debugInfo.contoursFound} • Top candidates: {debugInfo.candidates?.map((c,idx) => `${idx+1}: ${Math.round(c.area)}px/${c.approxRows}pts`).join(', ')}</div>
                )}
                {debugInfo?.candidates?.length > 0 && (
                  <div className="mt-2 flex gap-2">
                    {debugInfo.candidates.slice(0,3).map((c,idx) => (
                      <button key={idx} onClick={() => {
                        // Use candidate points as guide
                        const candidate = c
                        if (candidate && candidate.approxPoints && candidate.approxPoints.length >= 4) {
                          // pick 4 points either first 4 or evenly sampled
                          const ptsRaw = candidate.approxPoints
                          let pts4 = ptsRaw.slice(0,4)
                          if (ptsRaw.length > 4) {
                            const step = Math.floor(ptsRaw.length / 4)
                            pts4 = [ptsRaw[0], ptsRaw[step], ptsRaw[step*2], ptsRaw[step*3]]
                          }
                          // Map from debug image coords to canvas coords
                          const canvas = canvasRef.current
                          if (!canvas) return
                          const scale = canvas.width / (tempDetectWidthRef.current || canvas.width)
                          const mapped = pts4.map(p => ({ x: Math.round(p.x * scale), y: Math.round(p.y * scale) }))
                          setPoints(mapped)
                        }
                      }} className="text-xs px-2 py-1 rounded bg-gray-100">Usar guía {idx+1}</button>
                    ))}
                  </div>
                )}
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
            <RestoreButton points={points} canvasRef={canvasRef} previewCanvasRef={previewCanvasRef} setPreviewGenerated={setPreviewGenerated} setDebugImage={setDebugImage} setErrorDeteccion={setErrorDeteccion} />
          </div>
        </div>
      </div>
    </div>
  )
}
