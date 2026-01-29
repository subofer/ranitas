"use client"
import { memo } from 'react'
import { useVisionStatusContext } from '@/context/VisionStatusContext'

// Componente aislado que muestra el estado del modelo
// Se suscribe al contexto pero NO afecta a componentes padres
const ModelStatusIndicator = memo(function ModelStatusIndicator({ modelName, onPreload, preloading, preloadProgress, onUseHeuristic }) {
  const { getModelStatus, loadedModels } = useVisionStatusContext()
  const status = getModelStatus(modelName)
  const heuristicAvailable = Array.isArray(loadedModels) && loadedModels.some(m => m.name === 'heuristic/parser')

  // Button base to ensure consistent size and appearance and match select height
  const baseClasses = "inline-flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium min-w-[130px] justify-center"

  // If there's an overall preload progress active, show progress indicators
  if (preloadProgress && preloadProgress.total) {
    const total = preloadProgress.total || 0
    const done = preloadProgress.done || 0
    const current = preloadProgress.current || null

    // Normalize display count: if there's a current model being loaded, count it as 'in progress'
    const displayDone = Math.min(done + (current ? 1 : 0), total)

    // All done (show even if preloading flag turned false)
    if (done >= total && total > 0) {
      return (
        <div className="flex items-center gap-2 whitespace-nowrap">
          <div className={`${baseClasses} bg-green-50 border border-green-200 text-green-700 pointer-events-none`}>
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" aria-hidden></div>
            <span className="truncate">Cargados {done}/{total}</span>
          </div>
        </div>
      )
    }

    // Current model being loaded (show which one is in progress and a consistent count)
    if (current === modelName) {
      return (
        <div className="flex items-center gap-2 whitespace-nowrap">
          <div className={`${baseClasses} bg-orange-600 text-white border-orange-600`}>
            <span className="inline-block animate-spin">⏳</span>
            <span className="truncate">Cargando {displayDone}/{total}</span>
          </div>
        </div>
      )
    }

    // General loading state but not current
    return (
      <div className="flex items-center gap-2 whitespace-nowrap">
        <div className={`${baseClasses} bg-orange-50 text-orange-700 border border-orange-200`}>
          <div className="w-2 h-2 rounded-full bg-orange-500" aria-hidden></div>
          <span className="truncate">Cargando {displayDone}/{total}</span>
        </div>
      </div>
    )
  }

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
    return (
      <div className="flex items-center gap-2 whitespace-nowrap">
        <div className={`${baseClasses} bg-gray-50 text-gray-600 border border-gray-200 pointer-events-none min-w-[90px] text-center`}>
          <div className="w-2 h-2 rounded-full bg-gray-400 inline-block mr-1" aria-hidden></div>
          <span className="truncate">No cargado</span>
        </div>
        {heuristicAvailable && (
          <button
            onClick={() => onUseHeuristic && onUseHeuristic()}
            className="px-2 py-1 bg-gray-50 text-gray-700 rounded-md text-xs border border-gray-100 hover:bg-gray-100"
            title="Usar parser heurístico rápido"
          >
            Heurístico
          </button>
        )}
      </div>
    )
  }

  return null
})

export default ModelStatusIndicator
