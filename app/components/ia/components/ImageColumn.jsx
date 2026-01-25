"use client"

/**
 * Componente de columna de imagen
 * Muestra la imagen de la factura con controles de ajuste
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
  OptimizedImage
}) {
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
      
      <div className="relative">
        {!mostrarControles && (
          <OptimizedImage
            src={preview} 
            alt="Factura" 
            className="w-full rounded-lg shadow-lg border-2 border-gray-300" 
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
