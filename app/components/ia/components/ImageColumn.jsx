"use client"
import { useRef } from 'react'

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
  setPanStart
}) {
  const containerRef = useRef(null)
  
  // Manejar zoom con Ctrl + rueda
  const handleWheel = (e) => {
    if (e.ctrlKey) {
      e.preventDefault()
      e.stopPropagation()
      const delta = e.deltaY * -0.001
      const newZoom = Math.min(Math.max(0.5, zoom + delta), 5)
      setZoom(newZoom)
    }
  }
  
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
      setPan({
        x: e.clientX - panStart.x,
        y: e.clientY - panStart.y
      })
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
        <h3 className="font-bold text-gray-900">📄 Imagen original</h3>
        <div className="flex gap-2">
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
            ✖ Cerrar
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
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        {!mostrarControles && (
          <OptimizedImage
            src={preview} 
            alt="Factura" 
            className="w-full shadow-lg"
            style={{
              transform: `scale(${zoom}) translate(${pan.x / zoom}px, ${pan.y / zoom}px)`,
              transformOrigin: '0 0',
              transition: isPanning ? 'none' : 'transform 0.1s ease-out'
            }}
          />
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
