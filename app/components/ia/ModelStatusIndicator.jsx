"use client"
import { memo } from 'react'
import { useOllamaStatusContext } from '@/context/OllamaStatusContext'

// Componente aislado que muestra el estado del modelo
// Se suscribe al contexto pero NO afecta a componentes padres
const ModelStatusIndicator = memo(function ModelStatusIndicator({ modelName, onPreload, preloading }) {
  const { getModelStatus } = useOllamaStatusContext()
  const status = getModelStatus(modelName)

  // Button base to ensure consistent size and appearance and match select height
  const baseClasses = "inline-flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium min-w-[130px] justify-center"

  if (status === 'loaded') {
    return (
      <div className="flex items-center gap-2 whitespace-nowrap">
        <div className={`${baseClasses} bg-green-50 border border-green-200 text-green-700 pointer-events-none`}>
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" aria-hidden></div>
          <span className="truncate">Cargado</span>
        </div>
      </div>
    )
  }

  if (status === 'unloaded') {
    const disabled = preloading || !onPreload
    return (
      <div className="flex items-center gap-2 whitespace-nowrap">
        <button
          onClick={onPreload}
          disabled={disabled}
          className={`${baseClasses} ${preloading ? 'bg-orange-600 text-white border-orange-600' : 'bg-orange-50 text-orange-700 border border-orange-200 hover:bg-orange-100'} disabled:opacity-50`}
          aria-label={preloading ? 'Cargando modelo' : 'Precargar modelo'}
        >
          <span className={preloading ? 'inline-block animate-spin' : 'inline-block w-2 h-2 rounded-full bg-orange-500'} aria-hidden>
            {preloading ? '⏳' : ''}
          </span>
          <span className="truncate">{preloading ? 'Cargando...' : 'Cargar'}</span>
        </button>
      </div>
    )
  }

  return null
})

export default ModelStatusIndicator
