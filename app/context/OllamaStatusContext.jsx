"use client"
import { createContext, useContext, useState, useRef, useEffect, useCallback } from 'react'

const VisionStatusContext = createContext(null)

export function VisionStatusProvider({ children, autoRefresh = true, refreshInterval = 5000 }) {
  const [loadedModels, setLoadedModels] = useState([])
  const [modelStatuses, setModelStatuses] = useState({}) // { modelName: 'loaded' | 'unloaded' }
  const previousLoadedRef = useRef([])
  const intervalRef = useRef(null)
  const [currentPollingInterval, setCurrentPollingInterval] = useState(refreshInterval)

  // Sondeo y métricas del servicio
  const [probeState, setProbeState] = useState('waiting') // 'waiting' | 'ok' | 'error'
  const [statusInfo, setStatusInfo] = useState(null)

  // Ollama flags (safe defaults)
  const [useOllama, setUseOllama] = useState(false)
  const [ollamaAvailable, setOllamaAvailable] = useState(false)
  const [ollamaModelLoaded, setOllamaModelLoaded] = useState(false)

  const checkStatus = useCallback(async () => {
    try {
      setProbeState('waiting')

      // Prefer direct vision service if configured (NEXT_PUBLIC_VISION_HOST), fallback to local proxy
    const VISION_HOST = (typeof process !== 'undefined' && process.env && process.env.NEXT_PUBLIC_VISION_HOST) ? process.env.NEXT_PUBLIC_VISION_HOST : null
    // Query the server-side status endpoint `/api/ai/status` (server will talk to localhost:8000)
    let res = null
    let usedSource = null

    try {
      res = await fetch('/api/ai/status', { signal: AbortSignal.timeout(5000) })
      if (res && res.ok) usedSource = 'proxy'
      else res = null
    } catch (e) {
      res = null
    }

    if (!res) {
      // Server didnt respond: mark error but preserve last known status so UI doesn't 'break'
      setProbeState('error')
      return { ok: false, hasUnloaded: false }
    }

    // Parse JSON even if HTTP status is not OK; the server may include diagnostic 'status' object in error responses
    let data = null
    try {
      data = await res.json()
    } catch (err) {
      data = null
    }

      // If the vision service returns the structured 'vision-ai' payload use it as truth
      if (data && data.service === 'vision-ai') {
        // Map structured fields into our statusInfo and include the source used
        const si = {
          gpu: data?.cuda?.gpu || null,
          vram_gb: data?.cuda?.vram_gb || data?.cuda?.vram || null,
          vram_used: data?.cuda?.vram_used || null,
          uptime: data?.uptime || null,
          cpu: data?.cpu || null,
          ollama: data?.ollama || null,
          yolo: data?.yolo || null,
          docres: data?.docres || null,
          source: usedSource || null
        }
        setStatusInfo(si)
        setProbeState('ok')

        // Build loaded models from the structured payload
        const newLoadedModels = []
        try {
          if (Array.isArray(data?.ollama?.models) && data.ollama.models.length > 0) {
            data.ollama.models.forEach(m => newLoadedModels.push({ name: m, loaded: true }))
          } else if (data?.ollama?.configured_model) {
            newLoadedModels.push({ name: data.ollama.configured_model, loaded: !!data?.ollama?.ready })
          }
          if (data?.yolo?.loaded) newLoadedModels.push({ name: 'yolo/seg', loaded: true })
          if (data?.docres?.installed && data?.docres?.model_exists) newLoadedModels.push({ name: 'docres/default', loaded: true })
        } catch (e) {
          // ignore malformed
        }

        setLoadedModels(newLoadedModels)

        // Dispatch global event so other contexts (AiContext) can update immediately without polling
        try {
          if (typeof window !== 'undefined' && window.dispatchEvent) {
            window.dispatchEvent(new CustomEvent('vision-status', { detail: { loadedModels: newLoadedModels, statusInfo: si } }))
          }
        } catch (e) { /* ignore */ }

        // Ollama flags
        setUseOllama(!!(data?.ollama))
        setOllamaAvailable(!!data?.ollama?.ready)
        setOllamaModelLoaded(!!(data?.ollama && (data?.ollama?.models || data?.ollama?.configured_model)))

        const statuses = {}
        const loadedNames = new Set(newLoadedModels.map(m => m.name))
        newLoadedModels.forEach(m => { statuses[m.name] = 'loaded' })
        previousLoadedRef.current.forEach(m => { if (!loadedNames.has(m.name)) statuses[m.name] = 'unloaded' })
        setModelStatuses(statuses)
        previousLoadedRef.current = newLoadedModels

        const hasUnloaded = Object.values(statuses).some(s => s === 'unloaded')
        return { ok: true, hasUnloaded }
      }

      // Non-vision-ai payload or legacy response: keep behavior minimal and predictable.
      // Store the raw response as statusInfo and use any explicit loadedModels if provided.
      const info = (data && data.status) ? { ...data.status, source: usedSource || 'proxy' } : (data ? { ...data, source: usedSource || 'proxy' } : null)
      setStatusInfo(info)
      setProbeState('ok')

      const newLoadedModels = (data?.loadedModels && Array.isArray(data.loadedModels))
        ? data.loadedModels.map(m => (typeof m === 'string' ? { name: m, loaded: true } : { name: m.name || m.model || JSON.stringify(m), loaded: true }))
        : []

      setLoadedModels(newLoadedModels)

      // Dispatch a single concise event so AiContext can update models
      try {
        if (typeof window !== 'undefined' && window.dispatchEvent) {
          window.dispatchEvent(new CustomEvent('vision-status', { detail: { loadedModels: newLoadedModels, statusInfo: info } }))
        }
      } catch (e) { /* ignore */ }

      // Reset legacy flags to safe defaults
      setUseOllama(false)
      setOllamaAvailable(false)
      setOllamaModelLoaded(false)

      // Prepare simple status map
      const statuses = {}
      newLoadedModels.forEach(m => { statuses[m.name] = 'loaded' })
      previousLoadedRef.current.forEach(m => { if (!statuses[m.name]) statuses[m.name] = 'unloaded' })
      setModelStatuses(statuses)
      previousLoadedRef.current = newLoadedModels

      const hasUnloaded = Object.values(statuses).some(s => s === 'unloaded')
      return { ok: true, hasUnloaded }
    } catch (error) {
      // Error silencioso - es normal cuando Ollama está iniciando
      // Don't wipe previous state; preserve last known status so UI remains usable
      console.warn('Vision checkStatus error:', error)
      setProbeState('error')
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
      // If there are unloaded models (i.e., changes happening) or we're waiting for response, poll fast (1s)
      const desiredInterval = (res && res.hasUnloaded) ? 1000 : (probeState === 'waiting' ? 1000 : 5000)
      if (desiredInterval !== interval) {
        interval = desiredInterval
        stopPolling()
        pollingRef.current = setInterval(run, interval)
      }
    }

    // Run immediately and then set interval
    await run()
    if (!pollingRef.current) pollingRef.current = setInterval(run, interval)
  }, [checkStatus, currentPollingInterval, stopPolling, probeState])

  const startSSE = useCallback(() => {
    if (typeof window === 'undefined' || !window.EventSource) return false

    try {
      const es = new window.EventSource('/api/ai/status/stream')

      es.addEventListener('models', (e) => {
        try {
          const payload = JSON.parse(e.data)
          const newModels = payload.loadedModels || []

          // If payload includes status info, update
          if (payload.status) setStatusInfo(payload.status)
          setProbeState('ok')

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

    // Expose helper globals so other modules can force-refresh or query current status quickly
    if (typeof window !== 'undefined') {
      window.__visionRefresh = checkStatus
      window.__getVisionModelStatus = () => ({ loadedModels: [...loadedModels], statusInfo, probeState, modelStatuses })
    }

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
      if (typeof window !== 'undefined') {
        try { delete window.__visionRefresh } catch (e) {}
        try { delete window.__getVisionModelStatus } catch (e) {}
      }
    }
  }, [autoRefresh, refreshInterval, startSSE, startAdaptivePolling, stopSSE, stopPolling, checkStatus, loadedModels, statusInfo, probeState, modelStatuses])

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
      window.__visionPollingInterval = currentPollingInterval
      window.__setVisionPollingInterval = setPollingInterval
    }
  }, [currentPollingInterval, setPollingInterval])

  const value = {
    loadedModels,
    modelStatuses,
    getModelStatus,
    refresh: checkStatus,
    setPollingInterval,
    // Sondeo y métricas
    probeState,
    statusInfo,
    // Ollama-specific flags
    useOllama,
    ollamaAvailable,
    ollamaModelLoaded
  }

  return (
    <VisionStatusContext.Provider value={value}>
      {children}
    </VisionStatusContext.Provider>
  )
}

export function useVisionStatusContext() {
  const context = useContext(VisionStatusContext)
  if (!context) {
    throw new Error('useVisionStatusContext debe usarse dentro de VisionStatusProvider')
  }
  return context
}

// Backwards compatibility exports
export const OllamaStatusProvider = VisionStatusProvider
export const useOllamaStatusContext = useVisionStatusContext
