"use client"
import { createContext, useContext, useState, useRef, useEffect, useCallback } from 'react'

const OllamaStatusContext = createContext(null)

export function OllamaStatusProvider({ children, autoRefresh = true, refreshInterval = 5000 }) {
  const [loadedModels, setLoadedModels] = useState([])
  const [modelStatuses, setModelStatuses] = useState({}) // { modelName: 'loaded' | 'unloaded' }
  const previousLoadedRef = useRef([])
  const intervalRef = useRef(null)

  const checkStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/ai/status')
      const data = await res.json()
      
      if (data.ok) {
        const newLoadedModels = data.loadedModels || []
        setLoadedModels(newLoadedModels)
        
        // Actualizar estados de todos los modelos conocidos
        const statuses = {}
        const loadedNames = new Set(newLoadedModels.map(m => m.name))
        
        // Marcar modelos cargados
        newLoadedModels.forEach(model => {
          statuses[model.name] = 'loaded'
        })
        
        // Mantener registro de modelos previamente conocidos como unloaded
        previousLoadedRef.current.forEach(model => {
          if (!loadedNames.has(model.name)) {
            statuses[model.name] = 'unloaded'
          }
        })
        
        setModelStatuses(statuses)
        previousLoadedRef.current = newLoadedModels
      }
    } catch (error) {
      console.error('Error verificando estado Ollama:', error)
      setLoadedModels([])
    }
  }, [])

  useEffect(() => {
    // Carga inicial
    checkStatus()
    
    // Configurar polling solo si autoRefresh está activo
    if (autoRefresh) {
      intervalRef.current = setInterval(checkStatus, refreshInterval)
      return () => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current)
        }
      }
    }
  }, [autoRefresh, refreshInterval, checkStatus])

  const getModelStatus = useCallback((modelName) => {
    if (!modelName) return 'unloaded'
    return modelStatuses[modelName] || 'unloaded'
  }, [modelStatuses])

  const value = {
    loadedModels,
    modelStatuses,
    getModelStatus,
    refresh: checkStatus
  }

  return (
    <OllamaStatusContext.Provider value={value}>
      {children}
    </OllamaStatusContext.Provider>
  )
}

export function useOllamaStatusContext() {
  const context = useContext(OllamaStatusContext)
  if (!context) {
    throw new Error('useOllamaStatusContext debe usarse dentro de OllamaStatusProvider')
  }
  return context
}
