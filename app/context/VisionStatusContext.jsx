"use client"
import { createContext, useContext, useState, useRef, useEffect, useCallback } from 'react'

const VisionStatusContext = createContext(null)

export function VisionStatusProvider({ children, autoRefresh = true, refreshInterval = 5000 }) {
  const [loadedModels, setLoadedModels] = useState([])
  const [modelStatuses, setModelStatuses] = useState({})
  const previousLoadedRef = useRef([])
  const intervalRef = useRef(null)
  const [currentPollingInterval, setCurrentPollingInterval] = useState(refreshInterval)

  const [probeState, setProbeState] = useState('waiting')
  const [statusInfo, setStatusInfo] = useState(null)
  const [dockerServices, setDockerServices] = useState({ ia: null, db: null })

  const checkStatus = useCallback(async () => {
    try {
      setProbeState('waiting')

      // Query server-side status endpoint `/api/ai/status` (server talks to docker/vision service)
      let res = null
      try {
        res = await fetch('/api/ai/status', { signal: AbortSignal.timeout(5000) })
        if (!res || !res.ok) res = null
      } catch (e) { res = null }

      if (!res) {
        setProbeState('error')
        return { ok: false, hasUnloaded: false }
      }

      const data = await (async () => { try { return await res.json() } catch (e) { return null } })()
      if (!data) {
        setProbeState('error')
        return { ok: false, hasUnloaded: false }
      }

      // Trust the service payload as authoritative. Expose explicit docker service info (ia and db)
      const si = { ...data, source: data.service === 'vision-ai' ? 'vision-ai' : 'proxy' }
      setStatusInfo(si)
      setProbeState('ok')

      // Build loaded models only from explicit sources: data.loadedModels or named subsystem fields with model/models
      const newLoadedModels = []
      if (Array.isArray(data.loadedModels) && data.loadedModels.length > 0) {
        for (const m of data.loadedModels) newLoadedModels.push(typeof m === 'string' ? { name: m, loaded: true } : { name: m.name || String(m), loaded: true })
      } else {
        // collect from known subsystems without inventing names
        const subsystemKeys = ['yolo', 'ollama']
        for (const key of subsystemKeys) {
          const val = data[key]
          if (val && Array.isArray(val.models) && val.models.length > 0) {
            for (const m of val.models) newLoadedModels.push({ name: m, loaded: true })
          } else if (val && typeof val.model === 'string') {
            newLoadedModels.push({ name: val.model, loaded: true })
          } else if (val && typeof val.model_name === 'string') {
            newLoadedModels.push({ name: val.model_name, loaded: true })
          }
        }
      }

      setLoadedModels(newLoadedModels)

      // Keep docker-specific info grouped for easy consumption by UI
      const dockerServices = {
        ia: data?.container || data?.vision || null,
        db: data?.db || data?.postgres || null
      }
      setDockerServices(dockerServices)

      // Emit compact event
      try { if (typeof window !== 'undefined' && window.dispatchEvent) window.dispatchEvent(new CustomEvent('docker-status', { detail: { loadedModels: newLoadedModels, dockerServices, statusInfo: si } })) } catch (e) {}

      // Compute model statuses
      const statuses = {}
      const names = new Set(newLoadedModels.map(m => m.name))
      newLoadedModels.forEach(m => { statuses[m.name] = 'loaded' })
      previousLoadedRef.current.forEach(m => { if (!names.has(m.name)) statuses[m.name] = 'unloaded' })
      setModelStatuses(statuses)
      previousLoadedRef.current = newLoadedModels

      return { ok: true, hasUnloaded: Object.values(statuses).some(s => s === 'unloaded') }
    } catch (error) {
      console.warn('Docker checkStatus error:', error)
      setProbeState('error')
      return { ok: false, hasUnloaded: false }
    }
  }, [])

  // Polling/SSE simplified: prefer adaptive polling
  useEffect(() => {
    let polling = null
    const start = async () => {
      await checkStatus()
      polling = setInterval(checkStatus, currentPollingInterval)
    }
    start()
    return () => { if (polling) clearInterval(polling) }
  }, [checkStatus, currentPollingInterval])

  useEffect(() => { if (typeof window !== 'undefined') { window.__visionRefresh = checkStatus; window.__getVisionModelStatus = () => ({ loadedModels: [...loadedModels], statusInfo, probeState, modelStatuses }) } }, [checkStatus, loadedModels, statusInfo, probeState, modelStatuses])

  const getModelStatus = useCallback((modelName) => modelName ? (modelStatuses[modelName] || 'unloaded') : 'unloaded', [modelStatuses])

  const setPollingInterval = (newInterval) => { setCurrentPollingInterval(newInterval) }

  // Control API to manage docker services (ia / db)
  const controlService = useCallback(async (action, target = 'vision') => {
    try {
      const resp = await fetch('/api/ai/vision-control', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action, target }) })
      const json = await resp.json().catch(()=>({ ok: false, error: 'invalid json' }))
      if (!resp.ok) throw new Error(json?.error || 'control failed')
      // refresh state after action
      try { await checkStatus() } catch(e) {}
      return { ok: true, data: json }
    } catch (err) {
      return { ok: false, error: String(err) }
    }
  }, [checkStatus])

  const startService = (target) => controlService('start', target)
  const stopService = (target) => controlService('stop', target)
  const restartService = (target) => controlService('restart', target)
  const logsService = (target) => controlService('logs', target)

  const getServiceInfo = (target) => target === 'db' ? dockerServices.db : dockerServices.ia

  const value = { loadedModels, modelStatuses, getModelStatus, refresh: checkStatus, setPollingInterval, probeState, statusInfo, dockerServices, getServiceInfo, controlService, startService, stopService, restartService, logsService }

  return (
    <VisionStatusContext.Provider value={value}>
      {children}
    </VisionStatusContext.Provider>
  )
}

export function useVisionStatusContext() {
  const context = useContext(VisionStatusContext)
  if (!context) throw new Error('useVisionStatusContext debe usarse dentro de VisionStatusProvider')
  return context
}