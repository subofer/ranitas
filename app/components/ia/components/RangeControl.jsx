/**
 * Control de rango deslizable con label y visualización de valor
 * Componente reutilizable para sliders
 */
export function RangeControl({ label, icon, value, onChange, min = 0, max = 200, step = 1, color = 'blue' }) {
  const displayValue = typeof value === 'number' && value % 1 !== 0 
    ? value.toFixed(1) 
    : value
  
  const suffix = max === 3 ? 'x' : '%'
  
  return (
    <div>
      <label className="text-xs font-semibold text-gray-700 mb-1 flex items-center justify-between">
        <span>{icon} {label}</span>
        <span className={`text-${color}-600`}>
          {displayValue}{suffix}
        </span>
      </label>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={onChange}
        className={`w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-${color}-600`}
      />
    </div>
  )
}
