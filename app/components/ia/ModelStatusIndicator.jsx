"use client"
import { memo } from 'react'
import { useOllamaStatusContext } from '@/context/OllamaStatusContext'

// Componente aislado que muestra el estado del modelo
// Se suscribe al contexto pero NO afecta a componentes padres
const ModelStatusIndicator = memo(function ModelStatusIndicator({ 
  modelName, 
  onPreload, 
  preloading 
}) {
  const { getModelStatus } = useOllamaStatusContext()
  const status = getModelStatus(modelName)

  if (status === 'loaded') {
    return (
      <div className="flex items-center gap-2 px-3 py-2 bg-green-50 border border-green-200 text-green-700 rounded-lg text-sm">
        <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
        <span className="font-medium">Modelo cargado en VRAM</span>
      </div>
    )
  }

  if (status === 'unloaded') {
    return (
      <div className="flex items-center gap-2 px-3 py-2 bg-orange-50 border border-orange-200 text-orange-700 rounded-lg text-sm">
        <div className="w-2 h-2 rounded-full bg-orange-500"></div>
        <span>Modelo no cargado</span>
        {onPreload && (
          <button
            onClick={onPreload}
            disabled={preloading}
            className="ml-2 px-2 py-1 bg-orange-600 text-white rounded hover:bg-orange-700 disabled:opacity-50 text-xs font-medium"
          >
            {preloading ? '⏳ Cargando...' : '⚡ Precargar'}
          </button>
        )}
      </div>
    )
  }

  return null
})

export default ModelStatusIndicator
