"use client"
import { createContext, useContext, useState, useRef, useEffect, useCallback } from 'react'

const OllamaStatusContext = createContext(null)

export function OllamaStatusProvider({ children, autoRefresh = true, refreshInterval = 5000 }) {
  const [loadedModels, setLoadedModels] = useState([])
  const [modelStatuses, setModelStatuses] = useState({}) // { modelName: 'loaded' | 'unloaded' }
  const previousLoadedRef = useRef([])
  const intervalRef = useRef(null)
  const [currentPollingInterval, setCurrentPollingInterval] = useState(refreshInterval)

  const checkStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/ai/status', { 
        signal: AbortSignal.timeout(5000) // Timeout de 5s
      }).catch(() => null)
      
      if (!res) return { ok: false, hasUnloaded: false }
      
      const data = await res.json()

      if (data.ok) {
        const newLoadedModels = data.loadedModels || []
        setLoadedModels(newLoadedModels)

        // Actualizar estados de todos los modelos conocidos
        const statuses = {}
        const loadedNames = new Set(newLoadedModels.map(m => m.name))

        // Marcar modelos cargados
        newLoadedModels.forEach(m => {
          statuses[m.name] = 'loaded'
        })

        // Mantener registro de modelos previamente conocidos como unloaded
        previousLoadedRef.current.forEach(m => {
          if (!loadedNames.has(m.name)) {
            statuses[m.name] = 'unloaded'
          }
        })

        setModelStatuses(statuses)
        previousLoadedRef.current = newLoadedModels

        const hasUnloaded = Object.values(statuses).some(s => s === 'unloaded')
        return { ok: true, hasUnloaded }
      }

      return { ok: false, hasUnloaded: false }
    } catch (error) {
      // Error silencioso - es normal cuando Ollama está iniciando
      setLoadedModels([])
      return { ok: false, hasUnloaded: false }
    }
  }, [])

  // --- SSE / Adaptive Polling / Visibility handling ---
  const esRef = useRef(null)
  const pollingRef = useRef(null)

  const stopPolling = useCallback(() => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current)
      pollingRef.current = null
    }
  }, [])

  const stopSSE = useCallback(() => {
    if (esRef.current) {
      try { esRef.current.close() } catch (e) {}
      esRef.current = null
    }
  }, [])

  const startAdaptivePolling = useCallback(async (initialInterval = currentPollingInterval) => {
    stopPolling()
    let interval = initialInterval

    const run = async () => {
      const res = await checkStatus()
      const desiredInterval = (res && res.hasUnloaded) ? 2000 : 15000
      if (desiredInterval !== interval) {
        interval = desiredInterval
        stopPolling()
        pollingRef.current = setInterval(run, interval)
      }
    }

    // Run immediately and then set interval
    await run()
    if (!pollingRef.current) pollingRef.current = setInterval(run, interval)
  }, [checkStatus, currentPollingInterval, stopPolling])

  const startSSE = useCallback(() => {
    if (typeof window === 'undefined' || !window.EventSource) return false

    try {
      const es = new window.EventSource('/api/ai/status/stream')

      es.addEventListener('models', (e) => {
        try {
          const payload = JSON.parse(e.data)
          const newModels = payload.loadedModels || []

          // Update states similar to checkStatus
          const statuses = {}
          const loadedNames = new Set(newModels.map(m => m.name))
          newModels.forEach(m => { statuses[m.name] = 'loaded' })
          previousLoadedRef.current.forEach(m => { if (!loadedNames.has(m.name)) statuses[m.name] = 'unloaded' })

          setLoadedModels(newModels)
          setModelStatuses(statuses)
          previousLoadedRef.current = newModels
        } catch (err) {
          console.warn('SSE malformed models payload', err)
        }
      })

      es.onerror = (err) => {
        console.warn('SSE error, falling back to polling', err)
        try { es.close() } catch (e) {}
        esRef.current = null
        startAdaptivePolling(refreshInterval)
      }

      esRef.current = es
      return true
    } catch (err) {
      console.warn('SSE not available:', err)
      return false
    }
  }, [refreshInterval, startAdaptivePolling])

  useEffect(() => {
    if (!autoRefresh) return

    // Visibility handler: pause when hidden
    const onVisibility = () => {
      if (typeof document === 'undefined') return
      if (document.visibilityState === 'hidden') {
        stopSSE()
        stopPolling()
      } else {
        // Try SSE first, fallback to adaptive polling
        const ok = startSSE()
        if (!ok) startAdaptivePolling(refreshInterval)
      }
    }

    // Start: prefer SSE
    const started = startSSE()
    if (!started) startAdaptivePolling(refreshInterval)

    document.addEventListener('visibilitychange', onVisibility)

    return () => {
      stopSSE()
      stopPolling()
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [autoRefresh, refreshInterval, startSSE, startAdaptivePolling, stopSSE, stopPolling])

  const getModelStatus = useCallback((modelName) => {
    if (!modelName) return 'unloaded'
    return modelStatuses[modelName] || 'unloaded'
  }, [modelStatuses])

  const setPollingInterval = useCallback((newInterval) => {
    setCurrentPollingInterval(newInterval)
    // Reiniciar polling con nuevo intervalo
    if (pollingRef.current) {
      stopPolling()
      startAdaptivePolling(newInterval)
    }
  }, [stopPolling, startAdaptivePolling])

  // Exponer función global para que IaPromp pueda usarla
  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.__ollamaPollingInterval = currentPollingInterval
      window.__setOllamaPollingInterval = setPollingInterval
    }
  }, [currentPollingInterval, setPollingInterval])

  const value = {
    loadedModels,
    modelStatuses,
    getModelStatus,
    refresh: checkStatus,
    setPollingInterval
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
