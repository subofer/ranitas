"use client"
import { useRef, useEffect, useState } from 'react'
import ImageViewer from './ImageViewer'
import ManualVertexCropper from '../ManualVertexCropper'

/**
 * Componente de columna de imagen
 * Muestra la imagen de la factura con controles de ajuste, zoom y pan
 */
export function ImageColumn({ 
  preview, 
  mostrarControles, 
  setMostrarControles, 
  clear, 
  imgOriginalRef, 
  canvasRef,
  ajustes,
  setAjustes,
  aplicarAjustes,
  resetearAjustes,
  ImageControlsOverlay,
  OptimizedImage,
  zoom,
  setZoom,
  pan,
  setPan,
  isPanning,
  setIsPanning,
  panStart,
  setPanStart,
  onManualCrop,
  headerText = '📄 Imagen original',
  // Compare originals / carousel
  originalPreview = null,
  showOriginal = false,
  onToggleShowOriginal = null,
  onImageClick = null,
  // Carousel handlers
  onPrev = null,
  onNext = null,
  carouselCount = 0,
  carouselIndex = 0,
  carouselItems = [], // Array of {type, url}
  // Props adicionales para crop
  cropPoints = [],
  onCropPointsChange = null,
  extraHeaderButtons = null,
  cropMode = false,
  setCropMode = null,
  onPointUpdate = null,
  // Nueva prop para auto-detect crop
  onAutoDetectCrop = null,
}) {
  const containerRef = useRef(null)
  // Agregar event listener nativo para prevenir zoom del navegador
  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    
    const handleWheelNative = (e) => {
      if (e.ctrlKey) {
        e.preventDefault()
        e.stopPropagation()
        const delta = e.deltaY * -0.001
        const newZoom = Math.min(Math.max(0.2, zoom + delta), 5)
        setZoom(newZoom)
      }
    }
    
    // Usar addEventListener nativo con passive: false
    container.addEventListener('wheel', handleWheelNative, { passive: false })
    
    return () => {
      container.removeEventListener('wheel', handleWheelNative)
    }
  }, [zoom, setZoom])
  
  // Manejar inicio de pan con Ctrl + click o inicio de drag en crop mode
  const handleMouseDown = (e) => {
    if (e.ctrlKey) {
      // Pan con Ctrl, prioriza sobre crop mode
      e.preventDefault()
      e.stopPropagation()
      setIsPanning(true)
      setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y })
    } else if (cropMode) {
      // En crop mode
      if (cropPoints.length === 4) {
        // Si ya hay caja dibujada, solo permitir interacciones con ella
        const rect = e.currentTarget.getBoundingClientRect()
        const containerWidth = rect.width
        const containerHeight = rect.height
        const clickX = (e.clientX - rect.left - pan.x) / zoom / containerWidth
        const clickY = (e.clientY - rect.top - pan.y) / zoom / containerHeight
        
        // Primero verificar si está en una arista (prioridad sobre drag de caja)
        const edge = getEdgeNearPoint(clickX, clickY, cropPoints)
        if (edge) {
          // Click en arista: iniciar redimensionamiento
          setIsResizing(true)
          setResizeEdge(edge)
          setResizeStart({ x: e.clientX, y: e.clientY })
          return
        }
        
        // Si no está en arista, verificar si está dentro del rectángulo
        if (isPointInRectangle(clickX, clickY, cropPoints)) {
          // Click dentro de la caja: iniciar drag de caja completa
          setIsDraggingBox(true)
          setBoxDragStart({ x: e.clientX, y: e.clientY })
          return
        }
        // Si no está en arista ni dentro, no hacer nada (no dibujar nueva caja)
      } else {
        // Si no hay caja, iniciar potencial drag para nueva caja
        e.preventDefault()
        e.stopPropagation()
        const rect = e.currentTarget.getBoundingClientRect()
        const x = e.clientX - rect.left
        const y = e.clientY - rect.top
        setDragStart({ x, y })
        setDragEnd({ x, y })
        setIsDragging(false) // Se activa solo si hay movimiento
      }
    }
  }
  
  // Manejar movimiento de pan o drag de rectángulo/caja
  const handleMouseMove = (e) => {
    if (isResizing && resizeEdge && resizeStart) {
      // Redimensionamiento de arista
      e.preventDefault()
      e.stopPropagation()
      const rect = containerRef.current ? containerRef.current.getBoundingClientRect() : { width: 100, height: 100 }
      const containerWidth = rect.width
      const containerHeight = rect.height

      const deltaX = (e.clientX - resizeStart.x) / zoom / containerWidth
      const deltaY = (e.clientY - resizeStart.y) / zoom / containerHeight

      // Mover los dos puntos extremos de la arista seleccionada
      const newPoints = [...cropPoints]
      
      switch (resizeEdge) {
        case 'top':
          // Mover top-left y top-right en ambas direcciones (X e Y)
          newPoints[0] = { x: newPoints[0].x + deltaX, y: newPoints[0].y + deltaY }
          newPoints[1] = { x: newPoints[1].x + deltaX, y: newPoints[1].y + deltaY }
          break
        case 'bottom':
          // Mover bottom-right y bottom-left en ambas direcciones (X e Y)
          newPoints[2] = { x: newPoints[2].x + deltaX, y: newPoints[2].y + deltaY }
          newPoints[3] = { x: newPoints[3].x + deltaX, y: newPoints[3].y + deltaY }
          break
        case 'left':
          // Mover top-left y bottom-left en ambas direcciones (X e Y)
          newPoints[0] = { x: newPoints[0].x + deltaX, y: newPoints[0].y + deltaY }
          newPoints[3] = { x: newPoints[3].x + deltaX, y: newPoints[3].y + deltaY }
          break
        case 'right':
          // Mover top-right y bottom-right en ambas direcciones (X e Y)
          newPoints[1] = { x: newPoints[1].x + deltaX, y: newPoints[1].y + deltaY }
          newPoints[2] = { x: newPoints[2].x + deltaX, y: newPoints[2].y + deltaY }
          break
      }
      
      if (onCropPointsChange) {
        onCropPointsChange(newPoints)
      }

      setResizeStart({ x: e.clientX, y: e.clientY })
    } else if (isDraggingBox && boxDragStart) {
      // Drag de caja completa: mover todos los puntos
      e.preventDefault()
      e.stopPropagation()
      const rect = containerRef.current ? containerRef.current.getBoundingClientRect() : { width: 100, height: 100 }
      const containerWidth = rect.width
      const containerHeight = rect.height
      
      const deltaX = (e.clientX - boxDragStart.x) / zoom / containerWidth
      const deltaY = (e.clientY - boxDragStart.y) / zoom / containerHeight
      
      // Mover todos los puntos
      const newPoints = cropPoints.map(point => ({
        x: point.x + deltaX,
        y: point.y + deltaY
      }))
      
      if (onCropPointsChange) {
        onCropPointsChange(newPoints)
      }
      
      setBoxDragStart({ x: e.clientX, y: e.clientY })
    } else if (cropMode && dragStart) {
      // En crop mode, actualizar drag
      e.preventDefault()
      e.stopPropagation()
      const rect = e.currentTarget.getBoundingClientRect()
      const x = e.clientX - rect.left
      const y = e.clientY - rect.top
      setDragEnd({ x, y })
      
      // Activar drag si hay movimiento significativo
      const dx = Math.abs(x - dragStart.x)
      const dy = Math.abs(y - dragStart.y)
      if (dx > 5 || dy > 5) {
        setIsDragging(true)
      }
    } else if (isPanning && e.ctrlKey) {
      // Pan
      e.preventDefault()
      e.stopPropagation()
      const nextX = e.clientX - panStart.x
      const nextY = e.clientY - panStart.y
      // Clamp to reasonable bounds based on container size to avoid disappearance
      try {
        const rect = containerRef.current ? containerRef.current.getBoundingClientRect() : { width: 800, height: 600 }
        const limitX = Math.max(400, rect.width * 3)
        const limitY = Math.max(400, rect.height * 3)
        setPan({ x: Math.max(-limitX, Math.min(limitX, nextX)), y: Math.max(-limitY, Math.min(limitY, nextY)) })
      } catch (e) {
        setPan({ x: nextX, y: nextY })
      }
    }
  }
  
  // Terminar pan o procesar drag/click en crop mode
  const handleMouseUp = () => {
    if (isResizing) {
      // Terminar redimensionamiento
      setIsResizing(false)
      setResizeEdge(null)
      setResizeStart(null)
    } else if (isDraggingBox) {
      // Terminar drag de caja
      setIsDraggingBox(false)
      setBoxDragStart(null)
    } else if (cropMode && dragStart && dragEnd) {
      const rect = containerRef.current ? containerRef.current.getBoundingClientRect() : { width: 100, height: 100 }
      const containerWidth = rect.width
      const containerHeight = rect.height
      
      const dx = Math.abs(dragEnd.x - dragStart.x)
      const dy = Math.abs(dragEnd.y - dragStart.y)
      
      if (isDragging && dx > 10 && dy > 10) {
        // Fue drag significativo: crear puntos del rectángulo
        const minX = Math.min(dragStart.x, dragEnd.x)
        const maxX = Math.max(dragStart.x, dragEnd.x)
        const minY = Math.min(dragStart.y, dragEnd.y)
        const maxY = Math.max(dragStart.y, dragEnd.y)
        
        // Normalizar coordenadas
        const points = normalizeRectanglePoints(minX, maxX, minY, maxY, pan, zoom, containerWidth, containerHeight)
        
        if (onCropPointsChange) {
          onCropPointsChange(points)
        }
      } else if (!isDragging) {
        // Fue click (sin movimiento): agregar punto individual
        const normalizedPoint = {
          x: (dragStart.x - pan.x) / zoom / containerWidth,
          y: (dragStart.y - pan.y) / zoom / containerHeight
        }
        
        if (onCropPointsChange) {
          onCropPointsChange(prev => {
            // Limit to 4 points maximum
            if (prev.length >= 4) {
              console.log('Maximum 4 points reached, ignoring new point')
              return prev
            }
            const newPoints = [...prev, normalizedPoint]
            console.log('New cropPoints:', newPoints)
            return newPoints
          })
        }
      }
      
      // Limpiar drag
      setIsDragging(false)
      setDragStart(null)
      setDragEnd(null)
    }
    setIsPanning(false)
  }
  
  // Resetear zoom y pan
  const resetZoomPan = () => {
    setZoom(1)
    setPan({ x: 0, y: 0 })
  }
  
  // Estados para drag de rectángulo
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState(null)
  const [dragEnd, setDragEnd] = useState(null)
  
  // Estados para drag de caja completa
  const [isDraggingBox, setIsDraggingBox] = useState(false)
  const [boxDragStart, setBoxDragStart] = useState(null)
  
  // Estados para redimensionamiento de aristas
  const [isResizing, setIsResizing] = useState(false)
  const [resizeEdge, setResizeEdge] = useState(null)
  const [resizeStart, setResizeStart] = useState(null)
  
  // Estado para el cursor
  const [currentCursor, setCurrentCursor] = useState('crosshair')
  
  // Función para detectar si un punto está dentro del rectángulo formado por 4 puntos
  const isPointInRectangle = (px, py, points) => {
    if (!points || points.length !== 4) return false
    
    // Asumiendo orden: [top-left, top-right, bottom-right, bottom-left]
    const [tl, tr, br, bl] = points
    const minX = Math.min(tl.x, tr.x, br.x, bl.x)
    const maxX = Math.max(tl.x, tr.x, br.x, bl.x)
    const minY = Math.min(tl.y, tr.y, br.y, bl.y)
    const maxY = Math.max(tl.y, tr.y, br.y, bl.y)
    
    return px >= minX && px <= maxX && py >= minY && py <= maxY
  }
  
  // Función para detectar si un punto está cerca de una arista del rectángulo
  const getEdgeNearPoint = (px, py, points, tolerance = 0.08) => {
    if (!points || points.length !== 4) return null
    
    // Asumiendo orden: [top-left, top-right, bottom-right, bottom-left]
    const [tl, tr, br, bl] = points
    const minX = Math.min(tl.x, tr.x, br.x, bl.x)
    const maxX = Math.max(tl.x, tr.x, br.x, bl.x)
    const minY = Math.min(tl.y, tr.y, br.y, bl.y)
    const maxY = Math.max(tl.y, tr.y, br.y, bl.y)
    
    // Verificar aristas con tolerancia
    const nearTop = Math.abs(py - minY) <= tolerance && px >= minX - tolerance && px <= maxX + tolerance
    const nearBottom = Math.abs(py - maxY) <= tolerance && px >= minX - tolerance && px <= maxX + tolerance
    const nearLeft = Math.abs(px - minX) <= tolerance && py >= minY - tolerance && py <= maxY + tolerance
    const nearRight = Math.abs(px - maxX) <= tolerance && py >= minY - tolerance && py <= maxY + tolerance
    
    if (nearTop) return 'top'
    if (nearBottom) return 'bottom'
    if (nearLeft) return 'left'
    if (nearRight) return 'right'
    
    return null
  }
  
  // Función para normalizar coordenadas de rectángulo a puntos
  const normalizeRectanglePoints = (minX, maxX, minY, maxY, pan, zoom, containerWidth, containerHeight) => {
    return [
      { x: (minX - pan.x) / zoom / containerWidth, y: (minY - pan.y) / zoom / containerHeight }, // top-left
      { x: (maxX - pan.x) / zoom / containerWidth, y: (minY - pan.y) / zoom / containerHeight }, // top-right
      { x: (maxX - pan.x) / zoom / containerWidth, y: (maxY - pan.y) / zoom / containerHeight }, // bottom-right
      { x: (minX - pan.x) / zoom / containerWidth, y: (maxY - pan.y) / zoom / containerHeight }  // bottom-left
    ]
  }
  
  // Función para actualizar el cursor basado en la posición del mouse
  const updateCursor = (e) => {
    if (!cropMode || cropPoints.length !== 4) {
      setCurrentCursor('crosshair')
      return
    }
    
    const rect = e.currentTarget.getBoundingClientRect()
    const containerWidth = rect.width
    const containerHeight = rect.height
    const mouseX = (e.clientX - rect.left - pan.x) / zoom / containerWidth
    const mouseY = (e.clientY - rect.top - pan.y) / zoom / containerHeight
    
    const edge = getEdgeNearPoint(mouseX, mouseY, cropPoints)
    if (edge) {
      setCurrentCursor('grab')
    } else if (isPointInRectangle(mouseX, mouseY, cropPoints)) {
      setCurrentCursor('move')
    } else {
      setCurrentCursor('crosshair')
    }
  }
  
  // Crop points - ahora viene de props
  // const [cropPoints, setCropPoints] = useState([])

  // Sincronizar cropPoints con el prop onCropPointsChange - removido, ahora viene de props
  // useEffect(() => {
  //   if (onCropPointsChange) {
  //     onCropPointsChange(cropPoints)
  //   }
  // }, [cropPoints, onCropPointsChange])

  // Reset crop points when crop mode changes - ahora manejado en el padre
  // useEffect(() => {
  //   if (!cropMode) {
  //     setCropPoints([])
  //   }
  // }, [cropMode])

  const handlePointAdd = (point) => {
    console.log('ImageColumn handlePointAdd:', point)
    if (onCropPointsChange) {
      onCropPointsChange(prev => {
        // Limit to 4 points maximum
        if (prev.length >= 4) {
          console.log('Maximum 4 points reached, ignoring new point')
          return prev
        }
        const newPoints = [...prev, point]
        console.log('New cropPoints:', newPoints)
        return newPoints
      })
    }
  }

  const handlePointUpdate = (index, newPoint) => {
    console.log('ImageColumn handlePointUpdate:', index, newPoint)
    if (onCropPointsChange) {
      onCropPointsChange(prev => {
        const newPoints = [...prev]
        if (index >= 0 && index < newPoints.length) {
          newPoints[index] = newPoint
        }
        console.log('Updated cropPoints:', newPoints)
        return newPoints
      })
    }
  }
  return (
    <div className="bg-gray-50 border-2 border-gray-300 rounded-xl p-4 sticky top-4 h-fit">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-4">
          <h3 className="font-bold text-gray-900">Imagen</h3>
          <div className="flex bg-gray-100 rounded-lg p-1">
            {carouselItems && carouselItems.length > 0 ? (
              // Mostrar pestañas dinámicas basadas en carousel
              carouselItems.map((item, index) => (
                <button
                  key={item.type}
                  onClick={() => {
                    if (onPrev && onNext) {
                      // Usar carousel navigation
                      const diff = index - carouselIndex;
                      if (diff > 0) {
                        for (let i = 0; i < diff; i++) onNext();
                      } else if (diff < 0) {
                        for (let i = 0; i < Math.abs(diff); i++) onPrev();
                      }
                    }
                  }}
                  className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                    index === carouselIndex
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  {item.type === 'original' ? 'Original' :
                   item.type === 'recortada' ? 'Recortada' :
                   item.type === 'mejorada' ? 'Recortada' : // Unificar recortada y mejorada
                   item.type}
                </button>
              ))
            ) : (
              // Fallback al sistema antiguo si no hay carousel
              <>
                <button
                  onClick={() => onToggleShowOriginal && onToggleShowOriginal(false)}
                  className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                    !showOriginal
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Original
                </button>
                {originalPreview && (
                  <button
                    onClick={() => onToggleShowOriginal && onToggleShowOriginal(true)}
                    className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                      showOriginal
                        ? 'bg-white text-gray-900 shadow-sm'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    Recortada
                  </button>
                )}
              </>
            )}
          </div>
        </div>
          <div className="flex gap-2">
            {/* If manual crop mode is active, show provided header buttons (Accept/Cancel/Encuadrar) */}
            {!cropMode ? (
              (() => {
                const currentItem = carouselItems && carouselItems.length > 0 ? carouselItems[carouselIndex] : null;
                const isOriginal = currentItem?.type === 'original';
                
                if (!isOriginal) return null; // Solo mostrar botón en imagen original
                
                return (
                  <button
                    onClick={() => setCropMode && setCropMode(true)}
                    className="px-3 py-1.5 rounded-lg transition-colors text-sm font-medium bg-yellow-50 text-yellow-700 hover:bg-yellow-100"
                    title="Recortar manualmente con 4 vértices (se enderezará automáticamente)"
                  >
                    ✂️ Crop
                  </button>
                );
              })()
            ) : (
              extraHeaderButtons || null
            )}

            <button
              onClick={() => setMostrarControles(!mostrarControles)}
              className={`px-3 py-1.5 rounded-lg transition-colors text-sm font-medium ${
                mostrarControles 
                  ? 'bg-blue-600 text-white hover:bg-blue-700' 
                  : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
              }`}
              title="Ajustar contraste, brillo, zoom"
            >
              🎨 Ajustes
            </button>
            <button 
              onClick={clear}
              className="px-3 py-1.5 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors text-sm font-medium"
            >
              ✖ Eliminar
            </button>
          </div>
        </div>
        
        {/* Controles de Zoom y Pan */}
        <div className="mb-2 flex items-center justify-between bg-blue-50 border border-blue-200 rounded-lg px-3 py-2">
          <div className="text-xs text-blue-900">
            {cropMode ? (
              <>
                <span className="font-semibold">Modo Crop:</span> Click para punto individual, arrastrar para caja rectangular
              </>
            ) : (
              <>
                <span className="font-semibold">Zoom:</span> {(zoom * 100).toFixed(0)}%
                <span className="ml-3 text-blue-600">Ctrl+Rueda</span> para zoom
                <span className="ml-2 text-blue-600">Ctrl+Arrastrar</span> para mover
              </>
            )}
          </div>
          <button
            onClick={resetZoomPan}
            className="px-2 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700 transition-colors"
            title="Resetear zoom y posición"
          >
            ↺ Reset
          </button>
        </div>
        
        <div 
          ref={containerRef}
          className="relative overflow-hidden rounded-lg border-2 border-gray-300"
          style={{ cursor: cropMode ? (isResizing ? 'grabbing' : isDraggingBox ? 'grabbing' : currentCursor) : (isPanning ? 'grabbing' : 'grab') }}
          onMouseDown={handleMouseDown}
          onMouseMove={(e) => {
            handleMouseMove(e)
            if (cropMode && !isDragging && !isDraggingBox && !isResizing) {
              updateCursor(e)
            }
          }}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >

        {!mostrarControles && (
            <div className="relative">
              {/* Calcular puntos temporales durante drag */}
              {(() => {
                let tempPoints = cropPoints;
                if (isDragging && dragStart && dragEnd) {
                  const rect = containerRef.current ? containerRef.current.getBoundingClientRect() : { width: 100, height: 100 };
                  const containerWidth = rect.width;
                  const containerHeight = rect.height;
                  
                  const minX = Math.min(dragStart.x, dragEnd.x);
                  const maxX = Math.max(dragStart.x, dragEnd.x);
                  const minY = Math.min(dragStart.y, dragEnd.y);
                  const maxY = Math.max(dragStart.y, dragEnd.y);
                  
                  // Normalizar coordenadas usando la función helper
                  tempPoints = normalizeRectanglePoints(minX, maxX, minY, maxY, pan, zoom, containerWidth, containerHeight);
                }
                return (
                  <ImageViewer
                    src={carouselItems && carouselItems.length > 0 && carouselIndex < carouselItems.length
                      ? carouselItems[carouselIndex].url
                      : (showOriginal && originalPreview ? originalPreview : preview)}
                    zoom={zoom}
                    pan={pan}
                    points={tempPoints}
                    cropMode={cropMode}
                    onPointAdd={null}
                    onPointUpdate={handlePointUpdate}
                    onImageClick={() => onImageClick && onImageClick()}
                    className="shadow-lg rounded-lg pointer-events-auto"
                    imageRef={imgOriginalRef}
                  >
                    {/* Children overlays are rendered inside ImageViewer so transforms match */}


                    {/* Side overlay arrows for carousel (soft overlay, one each side) */}
                    {((originalPreview || typeof carouselCount === 'number') && (carouselCount || (originalPreview ? 1 : 0)) > 0) && (
                      <>
                        {carouselCount > 1 && (
                          <>
                            <button onClick={() => onPrev && onPrev()} title="Anterior" className="absolute left-3 top-1/2 -translate-y-1/2 bg-white/80 backdrop-blur-sm border rounded-full p-2 shadow text-lg z-30">◀</button>
                            <button onClick={() => onNext && onNext()} title="Siguiente" className="absolute right-3 top-1/2 -translate-y-1/2 bg-white/80 backdrop-blur-sm border rounded-full p-2 shadow text-lg z-30">▶</button>
                          </>
                        )}
                      </>
                    )}
                  </ImageViewer>
                );
              })()}
              
              {/* Rectángulo preview durante drag */}
              {isDragging && dragStart && dragEnd && (
                <div
                  className="absolute border-2 border-blue-500 bg-blue-200 bg-opacity-30 pointer-events-none"
                  style={{
                    left: Math.min(dragStart.x, dragEnd.x),
                    top: Math.min(dragStart.y, dragEnd.y),
                    width: Math.abs(dragEnd.x - dragStart.x),
                    height: Math.abs(dragEnd.y - dragStart.y),
                  }}
                />
              )}
            </div>
          )}

        <OptimizedImage
          ref={imgOriginalRef}
          src={preview} 
          alt="Original" 
          className="hidden" 
          crossOrigin="anonymous"
        />

        {mostrarControles && (
          <canvas 
            ref={canvasRef}
            className="w-full rounded-lg shadow-lg border-2 border-blue-400"
          />
        )}

        {mostrarControles && (
          <ImageControlsOverlay
            ajustes={ajustes}
            setAjustes={setAjustes}
            onApply={aplicarAjustes}
            onReset={resetearAjustes}
            onCancel={() => setMostrarControles(false)}
          />
        )}
      </div>
    </div>
  )
}
