"use client"
import { useRef, useState, useEffect } from 'react'
import GuideBox, { detectCornerHit, getCursorForCorner, resizeGuideFromCorner } from './GuideBox'

export default function ImageCropper({ src, onCrop, onCancel, mode = 'factura', points = null }) {
  const canvasRef = useRef(null)
  const imageRef = useRef(null)
  const [crop, setCrop] = useState({ x: 0, y: 0, width: 0, height: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const [dragType, setDragType] = useState(null)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const [dragGuideIndex, setDragGuideIndex] = useState(null)
  const [showGuides, setShowGuides] = useState(true)
  const [scale, setScale] = useState(1)
  const [guides, setGuides] = useState([])

  useEffect(() => {
    const img = new Image()
    img.src = src
    img.onload = () => {
      imageRef.current = img
      const canvas = canvasRef.current
      
      const maxWidth = window.innerWidth - 100
      const maxHeight = window.innerHeight - 250
      const imgScale = Math.min(maxWidth / img.width, maxHeight / img.height, 1)
      setScale(imgScale)
      
      canvas.width = img.width * imgScale
      canvas.height = img.height * imgScale
      
      const initialCrop = { 
        x: 0, 
        y: 0, 
        width: canvas.width, 
        height: canvas.height 
      }
      setCrop(initialCrop)
      setGuides(getDefaultGuidesForMode(initialCrop))
      drawImage()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [src])

  useEffect(() => {
    drawImage()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [crop, showGuides, guides])

  // If external points are provided (e.g., from an AI detector), apply them as the crop box.
  useEffect(() => {
    if (!points) return
    const canvas = canvasRef.current
    const img = imageRef.current
    if (!canvas || !img) return

    const w = canvas.width
    const h = canvas.height

    // Normalize or use pixel coords depending on values
    const pts = points.map(p => ({ x: (p.x <= 1 ? p.x * w : p.x), y: (p.y <= 1 ? p.y * h : p.y) }))
    const xs = pts.map(p => p.x)
    const ys = pts.map(p => p.y)
    const minX = Math.max(0, Math.floor(Math.min(...xs)))
    const maxX = Math.min(w, Math.ceil(Math.max(...xs)))
    const minY = Math.max(0, Math.floor(Math.min(...ys)))
    const maxY = Math.min(h, Math.ceil(Math.max(...ys)))

    const newCrop = { x: minX, y: minY, width: Math.max(20, maxX - minX), height: Math.max(20, maxY - minY) }
    setCrop(newCrop)
    // set guides to a single box matching the detection for easy adjustment
    setGuides([{ type: 'box', x: newCrop.x, y: newCrop.y, width: newCrop.width, height: newCrop.height, label: '📍 Detectado' }])
  }, [points, canvasRef, imageRef])

  const drawImage = () => {
    const canvas = canvasRef.current
    const img = imageRef.current
    if (!canvas || !img) return
    
    const ctx = canvas.getContext('2d')
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
    
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)'
    ctx.fillRect(0, 0, canvas.width, crop.y)
    ctx.fillRect(0, crop.y, crop.x, crop.height)
    ctx.fillRect(crop.x + crop.width, crop.y, canvas.width - crop.x - crop.width, crop.height)
    ctx.fillRect(0, crop.y + crop.height, canvas.width, canvas.height - crop.y - crop.height)
    
    ctx.strokeStyle = '#3b82f6'
    ctx.lineWidth = 2
    ctx.strokeRect(crop.x, crop.y, crop.width, crop.height)
    
    // Dibujar esquinas más grandes y visibles
    const cornerSize = 20
    ctx.fillStyle = '#3b82f6'
    const corners = [
      { x: crop.x, y: crop.y },
      { x: crop.x + crop.width, y: crop.y },
      { x: crop.x, y: crop.y + crop.height },
      { x: crop.x + crop.width, y: crop.y + crop.height },
    ]
    corners.forEach(corner => {
      ctx.fillRect(corner.x - cornerSize/2, corner.y - cornerSize/2, cornerSize, cornerSize)
      ctx.strokeStyle = 'white'
      ctx.lineWidth = 3
      ctx.strokeRect(corner.x - cornerSize/2, corner.y - cornerSize/2, cornerSize, cornerSize)
    })
    
    // Bordes más grandes para mejor interacción
    const edgeSize = 18
    ctx.fillStyle = '#3b82f6'
    const edges = [
      { x: crop.x + crop.width / 2, y: crop.y },
      { x: crop.x + crop.width / 2, y: crop.y + crop.height },
      { x: crop.x, y: crop.y + crop.height / 2 },
      { x: crop.x + crop.width, y: crop.y + crop.height / 2 },
    ]
    edges.forEach(edge => {
      ctx.beginPath()
      ctx.arc(edge.x, edge.y, edgeSize/2, 0, Math.PI * 2)
      ctx.fill()
      ctx.strokeStyle = 'white'
      ctx.lineWidth = 3
      ctx.stroke()
    })
    
    if (showGuides) {
      drawGuides(ctx)
    }
  }

  const drawGuides = (ctx) => {
    const colors = {
      'Proveedor': { stroke: 'rgba(34, 197, 94, 0.9)', fill: 'rgba(34, 197, 94, 0.2)' },
      'Fecha/Nro': { stroke: 'rgba(234, 179, 8, 0.9)', fill: 'rgba(234, 179, 8, 0.2)' },
      'Productos': { stroke: 'rgba(139, 92, 246, 0.9)', fill: 'rgba(139, 92, 246, 0.2)' },
      'Total': { stroke: 'rgba(239, 68, 68, 0.9)', fill: 'rgba(239, 68, 68, 0.2)' },
      'Marca/Nombre': { stroke: 'rgba(59, 130, 246, 0.9)', fill: 'rgba(59, 130, 246, 0.2)' },
      'Presentación': { stroke: 'rgba(168, 85, 247, 0.9)', fill: 'rgba(168, 85, 247, 0.2)' },
      'Código barras': { stroke: 'rgba(236, 72, 153, 0.9)', fill: 'rgba(236, 72, 153, 0.2)' },
    }
    
    guides.forEach((guide, index) => {
      const labelKey = guide.label?.replace(/[📍📅📦💰🏷️📏📊]/g, '').trim()
      const color = colors[labelKey] || { stroke: 'rgba(59, 130, 246, 0.8)', fill: 'rgba(59, 130, 246, 0.15)' }
      
      if (guide.type === 'box') {
        // Fondo semi-transparente
        ctx.fillStyle = color.fill
        ctx.fillRect(guide.x, guide.y, guide.width, guide.height)
        
        // Usar GuideBox para dibujar consistentemente
        GuideBox({ guide, color, ctx, isActive: dragGuideIndex === index })
      }
    })
  }

  const getDefaultGuidesForMode = (cropArea) => {
    const templates = {
      factura: [
        { type: 'box', xRatio: 0.05, yRatio: 0.05, wRatio: 0.4, hRatio: 0.15, label: '📍 Proveedor' },
        { type: 'box', xRatio: 0.55, yRatio: 0.05, wRatio: 0.4, hRatio: 0.15, label: '📅 Fecha/Nro' },
        { type: 'box', xRatio: 0.05, yRatio: 0.25, wRatio: 0.9, hRatio: 0.5, label: '📦 Productos' },
        { type: 'box', xRatio: 0.6, yRatio: 0.85, wRatio: 0.35, hRatio: 0.1, label: '💰 Total' },
      ],
      producto: [
        { type: 'box', xRatio: 0.1, yRatio: 0.1, wRatio: 0.8, hRatio: 0.3, label: '🏷️ Marca/Nombre' },
        { type: 'box', xRatio: 0.1, yRatio: 0.45, wRatio: 0.8, hRatio: 0.2, label: '📏 Presentación' },
        { type: 'box', xRatio: 0.1, yRatio: 0.7, wRatio: 0.8, hRatio: 0.15, label: '📊 Código barras' },
      ],
      general: []
    }
    
    const template = templates[mode] || []
    
    return template.map(t => {
      const guide = { ...t }
      
      if (t.type === 'box') {
        guide.x = cropArea.x + cropArea.width * t.xRatio
        guide.y = cropArea.y + cropArea.height * t.yRatio
        guide.width = cropArea.width * t.wRatio
        guide.height = cropArea.height * t.hRatio
      }
      
      return guide
    })
  }

  const handleMouseDown = (e) => {
    const rect = canvasRef.current.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    
    setDragStart({ x, y })
    
    // PRIORIDAD 1: Detectar esquinas de guías (para redimensionar)
    if (showGuides) {
      for (let i = 0; i < guides.length; i++) {
        const guide = guides[i]
        if (guide.type === 'box') {
          const corner = detectCornerHit(x, y, guide, 22)
          if (corner) {
            setIsDragging(true)
            setDragType('guide-corner-' + corner)
            setDragGuideIndex(i)
            return
          }
        }
      }
      // Ya NO permitimos arrastrar áreas completas - SOLO esquinas
    }
    
    // PRIORIDAD 2: Esquinas del crop principal
    const cornerHitSize = 30
    const corners = [
      { x: crop.x, y: crop.y, cursor: 'nw' },
      { x: crop.x + crop.width, y: crop.y, cursor: 'ne' },
      { x: crop.x, y: crop.y + crop.height, cursor: 'sw' },
      { x: crop.x + crop.width, y: crop.y + crop.height, cursor: 'se' },
    ]
    
    for (let corner of corners) {
      if (Math.abs(x - corner.x) <= cornerHitSize && Math.abs(y - corner.y) <= cornerHitSize) {
        setIsDragging(true)
        setDragType('corner-' + corner.cursor)
        return
      }
    }
    
    // PRIORIDAD 3: Bordes del crop principal (área más grande)
    const edgeHitSize = 20
    if (Math.abs(x - (crop.x + crop.width / 2)) <= edgeHitSize && Math.abs(y - crop.y) <= edgeHitSize) {
      setIsDragging(true)
      setDragType('edge-top')
      return
    }
    if (Math.abs(x - (crop.x + crop.width / 2)) <= edgeHitSize && Math.abs(y - (crop.y + crop.height)) <= edgeHitSize) {
      setIsDragging(true)
      setDragType('edge-bottom')
      return
    }
    if (Math.abs(y - (crop.y + crop.height / 2)) <= edgeHitSize && Math.abs(x - crop.x) <= edgeHitSize) {
      setIsDragging(true)
      setDragType('edge-left')
      return
    }
    if (Math.abs(y - (crop.y + crop.height / 2)) <= edgeHitSize && Math.abs(x - (crop.x + crop.width)) <= edgeHitSize) {
      setIsDragging(true)
      setDragType('edge-right')
      return
    }
    
    // PRIORIDAD 4: Mover crop SOLO si está dentro del marco azul
    if (x >= crop.x && x <= crop.x + crop.width && y >= crop.y && y <= crop.y + crop.height) {
      setIsDragging(true)
      setDragType('move')
      return
    }
    
    // Si hace click fuera, NO hacer nada (antes creaba nuevo crop)
  }

  const handleMouseMove = (e) => {
    const rect = canvasRef.current.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    
    if (!isDragging) {
      updateCursor(x, y)
      return
    }
    
    const dx = x - dragStart.x
    const dy = y - dragStart.y
    
    // Manejo de redimensionamiento de guías - TODAS las esquinas
    if (dragType?.startsWith('guide-corner-')) {
      const cornerName = dragType.replace('guide-corner-', '')
      const newGuides = [...guides]
      const updatedGuide = resizeGuideFromCorner(guides[dragGuideIndex], cornerName, x, y, crop)
      newGuides[dragGuideIndex] = updatedGuide
      setGuides(newGuides)
    }
    // Manejo del crop principal
    else if (dragType === 'move') {
      const newCrop = { ...crop }
      newCrop.x = Math.max(0, Math.min(canvasRef.current.width - crop.width, crop.x + dx))
      newCrop.y = Math.max(0, Math.min(canvasRef.current.height - crop.height, crop.y + dy))
      setCrop(newCrop)
      setDragStart({ x, y })
    } else if (dragType?.startsWith('corner-')) {
      const newCrop = { ...crop }
      
      if (dragType.includes('n')) {
        const newY = Math.max(0, Math.min(y, crop.y + crop.height - 20))
        newCrop.height = crop.height + (crop.y - newY)
        newCrop.y = newY
      }
      if (dragType.includes('s')) {
        newCrop.height = Math.max(20, Math.min(canvasRef.current.height - crop.y, y - crop.y))
      }
      if (dragType.includes('w')) {
        const newX = Math.max(0, Math.min(x, crop.x + crop.width - 20))
        newCrop.width = crop.width + (crop.x - newX)
        newCrop.x = newX
      }
      if (dragType.includes('e')) {
        newCrop.width = Math.max(20, Math.min(canvasRef.current.width - crop.x, x - crop.x))
      }
      
      setCrop(newCrop)
    } else if (dragType?.startsWith('edge-')) {
      const newCrop = { ...crop }
      
      if (dragType === 'edge-top') {
        const newY = Math.max(0, Math.min(y, crop.y + crop.height - 20))
        newCrop.height = crop.height + (crop.y - newY)
        newCrop.y = newY
      } else if (dragType === 'edge-bottom') {
        newCrop.height = Math.max(20, Math.min(canvasRef.current.height - crop.y, y - crop.y))
      } else if (dragType === 'edge-left') {
        const newX = Math.max(0, Math.min(x, crop.x + crop.width - 20))
        newCrop.width = crop.width + (crop.x - newX)
        newCrop.x = newX
      } else if (dragType === 'edge-right') {
        newCrop.width = Math.max(20, Math.min(canvasRef.current.width - crop.x, x - crop.x))
      }
      
      setCrop(newCrop)
    } else if (dragType === 'new') {
      // Ya NO permitimos crear nuevo crop
      return
    }
  }
  
  const updateCursor = (x, y) => {
    const canvas = canvasRef.current
    if (!canvas) return
    
    // Detectar SOLO esquinas de guías (puntos de control)
    if (showGuides) {
      for (let guide of guides) {
        if (guide.type === 'box') {
          const corner = detectCornerHit(x, y, guide, 22)
          if (corner) {
            canvas.style.cursor = getCursorForCorner(corner)
            return
          }
        }
      }
    }
    
    // Detectar esquinas del crop (área más grande)
    const cornerHitSize = 30
    const corners = [
      { x: crop.x, y: crop.y, cursor: 'nw-resize' },
      { x: crop.x + crop.width, y: crop.y, cursor: 'ne-resize' },
      { x: crop.x, y: crop.y + crop.height, cursor: 'sw-resize' },
      { x: crop.x + crop.width, y: crop.y + crop.height, cursor: 'se-resize' },
    ]
    
    for (let corner of corners) {
      if (Math.abs(x - corner.x) <= cornerHitSize && Math.abs(y - corner.y) <= cornerHitSize) {
        canvas.style.cursor = corner.cursor
        return
      }
    }
    
    // Detectar bordes del crop (área más grande)
    const edgeHitSize = 20
    if (Math.abs(x - (crop.x + crop.width / 2)) <= edgeHitSize && Math.abs(y - crop.y) <= edgeHitSize) {
      canvas.style.cursor = 'n-resize'
      return
    }
    if (Math.abs(x - (crop.x + crop.width / 2)) <= edgeHitSize && Math.abs(y - (crop.y + crop.height)) <= edgeHitSize) {
      canvas.style.cursor = 's-resize'
      return
    }
    if (Math.abs(y - (crop.y + crop.height / 2)) <= edgeHitSize && Math.abs(x - crop.x) <= edgeHitSize) {
      canvas.style.cursor = 'w-resize'
      return
    }
    if (Math.abs(y - (crop.y + crop.height / 2)) <= edgeHitSize && Math.abs(x - (crop.x + crop.width)) <= edgeHitSize) {
      canvas.style.cursor = 'e-resize'
      return
    }
    
    if (x >= crop.x && x <= crop.x + crop.width && y >= crop.y && y <= crop.y + crop.height) {
      canvas.style.cursor = 'move'
      return
    }
    
    canvas.style.cursor = 'crosshair'
  }

  const handleMouseUp = () => {
    setIsDragging(false)
    setDragType(null)
    setDragGuideIndex(null)
  }

  const handleCrop = () => {
    const canvas = canvasRef.current
    const img = imageRef.current
    if (!canvas || !img) return
    
    const cropCanvas = document.createElement('canvas')
    const cropCtx = cropCanvas.getContext('2d')
    
    const realX = crop.x / scale
    const realY = crop.y / scale
    const realWidth = crop.width / scale
    const realHeight = crop.height / scale
    
    cropCanvas.width = realWidth
    cropCanvas.height = realHeight
    
    cropCtx.drawImage(
      img,
      realX, realY, realWidth, realHeight,
      0, 0, realWidth, realHeight
    )
    
    cropCanvas.toBlob((blob) => {
      const file = new File([blob], 'cropped-image.jpg', { type: 'image/jpeg' })
      onCrop(file, URL.createObjectURL(blob))
    }, 'image/jpeg', 0.95)
  }

  const resetCrop = () => {
    const newCrop = { 
      x: 0, 
      y: 0, 
      width: canvasRef.current.width, 
      height: canvasRef.current.height 
    }
    setCrop(newCrop)
    setGuides(getDefaultGuidesForMode(newCrop))
  }

  const autoDetectRegions = async () => {
    if (!imageRef.current || !model) return
    
    setAutoDetecting(true)
    try {
      const canvas = canvasRef.current
      const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.95))
      const file = new File([blob], 'detect.jpg', { type: 'image/jpeg' })
      
      let detectPrompt = ''
      if (mode === 'factura') {
        detectPrompt = `Analiza esta imagen de factura y detecta las coordenadas aproximadas (en porcentajes de 0 a 100) de estas regiones:
1. Proveedor (nombre/razón social del emisor)
2. Fecha y número de factura
3. Área de productos/items
4. Total a pagar

Responde SOLO con un JSON válido en este formato exacto:
{
  "proveedor": {"x": 5, "y": 5, "width": 40, "height": 15},
  "fecha": {"x": 55, "y": 5, "width": 40, "height": 15},
  "productos": {"x": 5, "y": 25, "width": 90, "height": 50},
  "total": {"x": 60, "y": 85, "width": 35, "height": 10}
}`
      } else if (mode === 'producto') {
        detectPrompt = `Analiza esta imagen de producto y detecta las coordenadas aproximadas (en porcentajes de 0 a 100) de estas regiones:
1. Marca y nombre del producto
2. Presentación (peso, volumen, cantidad)
3. Código de barras

Responde SOLO con un JSON válido en este formato exacto:
{
  "marca": {"x": 10, "y": 10, "width": 80, "height": 30},
  "presentacion": {"x": 10, "y": 45, "width": 80, "height": 20},
  "codigo": {"x": 10, "y": 70, "width": 80, "height": 15}
}`
      }
      
      const fd = new FormData()
      fd.append('image', file)
      fd.append('model', model)
      fd.append('prompt', detectPrompt)
      
      const res = await fetch('/api/ai/image', { method: 'POST', body: fd })
      const data = await res.json()
      
      if (data.ok && data.text) {
        try {
          const jsonMatch = data.text.match(/\{[\s\S]*\}/)
          if (jsonMatch) {
            const detected = JSON.parse(jsonMatch[0])
            
            const newGuides = [...guides]
            
            if (mode === 'factura') {
              const mapping = {
                'proveedor': 0,
                'fecha': 1,
                'productos': 2,
                'total': 3
              }
              
              Object.keys(mapping).forEach(key => {
                if (detected[key] && newGuides[mapping[key]]) {
                  const d = detected[key]
                  newGuides[mapping[key]].x = crop.x + (crop.width * d.x / 100)
                  newGuides[mapping[key]].y = crop.y + (crop.height * d.y / 100)
                  newGuides[mapping[key]].width = crop.width * d.width / 100
                  newGuides[mapping[key]].height = crop.height * d.height / 100
                }
              })
            } else if (mode === 'producto') {
              const mapping = {
                'marca': 0,
                'presentacion': 1,
                'codigo': 2
              }
              
              Object.keys(mapping).forEach(key => {
                if (detected[key] && newGuides[mapping[key]]) {
                  const d = detected[key]
                  newGuides[mapping[key]].x = crop.x + (crop.width * d.x / 100)
                  newGuides[mapping[key]].y = crop.y + (crop.height * d.y / 100)
                  newGuides[mapping[key]].width = crop.width * d.width / 100
                  newGuides[mapping[key]].height = crop.height * d.height / 100
                }
              })
            }
            
            setGuides(newGuides)
          }
        } catch (e) {
          console.error('Error parsing auto-detect response:', e)
        }
      }
    } catch (e) {
      console.error('Error auto-detecting:', e)
    } finally {
      setAutoDetecting(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-90 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-[95vw] h-[95vh] flex flex-col">
        <div className="p-4 border-b border-gray-200 flex items-center justify-between flex-shrink-0">
          <div>
            <h3 className="font-semibold text-lg text-gray-900">✂️ Recortar imagen y definir regiones</h3>
            <p className="text-sm text-gray-600 mt-1">
              <span className="font-medium">💡 Controles:</span> 
              Arrastra los <span className="font-semibold text-purple-600">puntos de control (círculos)</span> en las esquinas para ajustar campos • 
              Marco azul para ajustar el recorte general • 
              Click fuera no hace nada
            </p>
          </div>
          <button 
            onClick={onCancel}
            className="text-gray-500 hover:text-gray-700 text-3xl leading-none px-2"
          >
            ×
          </button>
        </div>
        
        <div className="flex-1 overflow-auto p-4">
          <div className="mb-3 flex gap-3 items-center flex-wrap">
            <button
              onClick={() => setShowGuides(!showGuides)}
              className={`px-3 py-1.5 rounded-lg text-sm border transition-colors ${
                showGuides 
                  ? 'bg-blue-50 border-blue-300 text-blue-700' 
                  : 'bg-gray-50 border-gray-300 text-gray-700'
              }`}
            >
              {showGuides ? '👁️ Ocultar guías' : '👁️ Mostrar guías'}
            </button>
            
            {model && mode !== 'general' && (
              <button
                onClick={autoDetectRegions}
                disabled={autoDetecting}
                className="px-3 py-1.5 rounded-lg text-sm border border-purple-300 bg-purple-50 text-purple-700 hover:bg-purple-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                title="Detectar automáticamente las posiciones de los campos usando IA"
              >
                {autoDetecting ? (
                  <>
                    <svg className="animate-spin h-4 w-4 text-purple-700" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>Analizando imagen con IA...</span>
                  </>
                ) : '🤖 Auto-detectar campos'}
              </button>
            )}
            
            <button
              onClick={resetCrop}
              className="px-3 py-1.5 rounded-lg text-sm border border-gray-300 bg-gray-50 text-gray-700 hover:bg-gray-100"
            >
              🔄 Restablecer
            </button>
            
            <div className="ml-auto text-sm text-gray-700 font-medium bg-gray-100 px-3 py-1.5 rounded-lg border border-gray-300">
              📐 {Math.round(crop.width / scale)} × {Math.round(crop.height / scale)} px
            </div>
          </div>
          
          <div className="bg-gray-900 rounded-lg flex justify-center items-center min-h-0" style={{ height: 'calc(100% - 60px)' }}>
            <canvas
              ref={canvasRef}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              className="max-w-full max-h-full"
              style={{ touchAction: 'none' }}
            />
          </div>
        </div>
        
        <div className="p-4 border-t border-gray-200 flex gap-3 justify-end flex-shrink-0">
          <button
            onClick={onCancel}
            className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
          >
            Cancelar
          </button>
          <button
            onClick={handleCrop}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            ✂️ Aplicar recorte
          </button>
        </div>
      </div>
    </div>
  )
}
