import { RangeControl } from './RangeControl'

/**
 * Overlay de controles de imagen
 * Panel flotante sin opacar toda la imagen
 */
export function ImageControlsOverlay({ ajustes, setAjustes, onApply, onReset, onCancel }) {
  return (
    <div className="absolute inset-0 rounded-lg flex items-start p-4 pointer-events-none z-10">
      <div className="w-full bg-white/98 backdrop-blur-md rounded-xl p-5 shadow-2xl pointer-events-auto border-2 border-blue-500">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-gray-900 flex items-center gap-2">
            <span className="text-xl">🎨</span>
            <span>Ajustar Imagen</span>
          </h3>
          <button
            onClick={onCancel}
            className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-lg hover:bg-gray-100"
            title="Cerrar controles"
          >
            ✖️
          </button>
        </div>
        
        <div className="grid grid-cols-2 gap-4 mb-4">
          <RangeControl
            label="Contraste"
            icon="🎨"
            value={ajustes.contraste}
            onChange={(e) => setAjustes({...ajustes, contraste: parseInt(e.target.value)})}
            color="blue"
          />
          <RangeControl
            label="Brillo"
            icon="💡"
            value={ajustes.brillo}
            onChange={(e) => setAjustes({...ajustes, brillo: parseInt(e.target.value)})}
            color="yellow"
          />
          <RangeControl
            label="Saturación"
            icon="🌈"
            value={ajustes.saturacion}
            onChange={(e) => setAjustes({...ajustes, saturacion: parseInt(e.target.value)})}
            color="purple"
          />
          <RangeControl
            label="Zoom"
            icon="🔍"
            value={ajustes.zoom}
            onChange={(e) => setAjustes({...ajustes, zoom: parseFloat(e.target.value)})}
            min={0.5}
            max={3}
            step={0.1}
            color="green"
          />
        </div>
        
        <div className="mb-4">
          <label className="text-xs font-semibold text-gray-700 mb-2 block">🧭 Desplazar (Pan)</label>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
                <span>←→ Horizontal</span>
                <span className="font-mono text-blue-600">{(ajustes.panX * 100).toFixed(0)}</span>
              </div>
              <input
                type="range"
                min="-0.5"
                max="0.5"
                step="0.01"
                value={ajustes.panX}
                onChange={(e) => setAjustes({...ajustes, panX: parseFloat(e.target.value)})}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
              />
            </div>
            <div>
              <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
                <span>↑↓ Vertical</span>
                <span className="font-mono text-blue-600">{(ajustes.panY * 100).toFixed(0)}</span>
              </div>
              <input
                type="range"
                min="-0.5"
                max="0.5"
                step="0.01"
                value={ajustes.panY}
                onChange={(e) => setAjustes({...ajustes, panY: parseFloat(e.target.value)})}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
              />
            </div>
          </div>
        </div>
        
        <div className="flex gap-2">
          <button
            onClick={onApply}
            className="flex-1 px-5 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-bold text-sm shadow-lg hover:shadow-xl"
          >
            ✔️ Aplicar
          </button>
          <button
            onClick={onReset}
            className="px-5 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium text-sm"
          >
            ↺ Reset
          </button>
          <button
            onClick={onCancel}
            className="px-5 py-3 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors font-medium text-sm"
          >
            ✖️ Cancelar
          </button>
        </div>
      </div>
    </div>
  )
}
