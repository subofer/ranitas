"use client"
import { useEffect, useState, useRef, useCallback } from 'react'

export function useOllamaStatus({ selectedModel, autoRefresh = true }) {
  const [loadedModels, setLoadedModels] = useState([])
  const [loading, setLoading] = useState(false)
  const [modelStatus, setModelStatus] = useState(null) // 'loaded' | 'loading' | 'unloaded'
  const previousLoadedRef = useRef([])

  const checkStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/ai/status')
      const data = await res.json()
      
      if (data.ok) {
        const newLoadedModels = data.loadedModels || []
        setLoadedModels(newLoadedModels)
        
        // Verificar si el modelo seleccionado está cargado
        if (selectedModel) {
          const isLoaded = newLoadedModels.some(m => m.name === selectedModel)
          const wasLoaded = previousLoadedRef.current.some(m => m.name === selectedModel)
          
          if (!wasLoaded && isLoaded) {
            // El modelo acaba de cargarse
            setModelStatus('loaded')
          } else if (isLoaded) {
            setModelStatus('loaded')
          } else {
            setModelStatus('unloaded')
          }
        }
        
        previousLoadedRef.current = newLoadedModels
      }
    } catch (error) {
      console.error('Error verificando estado:', error)
      setLoadedModels([])
    }
  }, [selectedModel])

  useEffect(() => {
    checkStatus()
    
    if (autoRefresh) {
      const interval = setInterval(checkStatus, 2000) // Cada 2 segundos
      return () => clearInterval(interval)
    }
  }, [selectedModel, autoRefresh, checkStatus])

  return {
    loadedModels,
    modelStatus,
    loading,
    refresh: checkStatus
  }
}
