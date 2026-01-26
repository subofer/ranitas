import { RangeControl } from './RangeControl'

/**
 * Overlay de controles de imagen
 * Panel flotante sin opacar toda la imagen
 */
export function ImageControlsOverlay({ ajustes, setAjustes, onApply, onReset, onCancel }) {
  return (
    // Panel compacto anclado en la esquina superior derecha para no bloquear la interacción con la imagen
    <div className="absolute top-3 right-3 pointer-events-none z-10">
      <div className="w-72 bg-white/95 backdrop-blur-md rounded-lg p-3 shadow-lg pointer-events-auto border border-blue-300 text-sm">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-semibold text-gray-900 flex items-center gap-2">
            <span className="text-base">🎨</span>
            <span>Ajustar</span>
          </h3>
          <button
            onClick={onCancel}
            className="text-gray-500 hover:text-gray-700 transition-colors p-1 rounded"
            title="Cerrar controles"
          >
            ✖
          </button>
        </div>

        <div className="grid grid-cols-2 gap-2 mb-3">
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
            label="Afilar"
            icon="✴️"
            value={ajustes.afilar}
            onChange={(e) => setAjustes({...ajustes, afilar: parseInt(e.target.value)})}
            min={0}
            max={100}
            step={1}
            color="green"
          />
          <RangeControl
            label="Bordes"
            icon="🔎"
            value={ajustes.bordes}
            onChange={(e) => setAjustes({...ajustes, bordes: parseInt(e.target.value)})}
            min={0}
            max={100}
            step={1}
            color="teal"
          />
        </div>

        {/* Eliminamos controles de pan para permitir pan libre con Ctrl+arrastrar y ctrl+rueda */}

        <div className="flex gap-2">
          <button
            onClick={onApply}
            className="flex-1 px-3 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors font-semibold text-sm"
          >
            Aplicar
          </button>
          <button
            onClick={onReset}
            className="px-3 py-2 bg-gray-100 text-gray-800 rounded-md hover:bg-gray-200 transition-colors text-sm"
          >
            Reset
          </button>
          <button
            onClick={onCancel}
            className="px-3 py-2 bg-red-50 text-red-700 rounded-md hover:bg-red-100 transition-colors text-sm"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  )
}
