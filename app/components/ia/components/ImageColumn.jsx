"use client"
import { useRef, useEffect } from 'react'
import ImageViewer from './ImageViewer'

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
  // New props to integrate manual crop UI while keeping header/layout stable
  manualCropOpen = false,
  extraHeaderButtons = null,
  manualComponent = null,
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
  
  // Manejar inicio de pan con Ctrl + click
  const handleMouseDown = (e) => {
    if (e.ctrlKey) {
      e.preventDefault()
      e.stopPropagation()
      setIsPanning(true)
      setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y })
    }
  }
  
  // Manejar movimiento de pan
  const handleMouseMove = (e) => {
    if (isPanning && e.ctrlKey) {
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
  
  // Terminar pan
  const handleMouseUp = () => {
    setIsPanning(false)
  }
  
  // Resetear zoom y pan
  const resetZoomPan = () => {
    setZoom(1)
    setPan({ x: 0, y: 0 })
  }
  return (
    <div className="bg-gray-50 border-2 border-gray-300 rounded-xl p-4 sticky top-4 h-fit">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-bold text-gray-900">{headerText}</h3>
        <div className="flex gap-2">
          {/* If manual crop mode is active, show provided header buttons (Accept/Cancel/Encuadrar) */}
          {!manualCropOpen ? (
            <button
              onClick={onManualCrop}
              className="px-3 py-1.5 rounded-lg transition-colors text-sm font-medium bg-yellow-50 text-yellow-700 hover:bg-yellow-100"
              title="Recortar manualmente con 4 vértices"
            >
              ✂️ Crop
            </button>
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
          <span className="font-semibold">Zoom:</span> {(zoom * 100).toFixed(0)}%
          <span className="ml-3 text-blue-600">Ctrl+Rueda</span> para zoom
          <span className="ml-2 text-blue-600">Ctrl+Arrastrar</span> para mover
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
        style={{ cursor: isPanning ? 'grabbing' : 'grab' }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        {/* Image content (always present). If manual cropping is active, an absolute overlay will sit on top of the image to avoid layout shifts */}

        {!mostrarControles && (
            <div className="relative">
              <ImageViewer
                src={showOriginal && originalPreview ? originalPreview : preview}
                zoom={zoom}
                setZoom={setZoom}
                pan={pan}
                setPan={setPan}
                isPanning={isPanning}
                setIsPanning={setIsPanning}
                onImageClick={() => onImageClick && onImageClick()}
                className={`shadow-lg rounded-lg ${manualComponent ? 'pointer-events-none' : 'pointer-events-auto'}`}
                imageRef={imgOriginalRef}
              >
                {/* Children overlays (manualComponent) are rendered inside ImageViewer so transforms match */}
                {manualComponent}

                {/* Side overlay arrows for carousel (soft overlay, one each side) */}
                {((originalPreview || typeof carouselCount === 'number') && (carouselCount || (originalPreview ? 1 : 0)) > 0 && !manualComponent) && (
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

        {/* Manual component overlay (absolute) */}
        {manualComponent && (
          <div className="absolute inset-0 z-20 w-full h-full flex items-stretch p-0 m-0 pointer-events-auto bg-transparent">{manualComponent}</div>
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
