"use client"
import React, { createContext, useContext, useEffect, useState } from 'react'

const AiContext = createContext(null)

export function AiProvider({ children }) {
  const [models, setModels] = useState([])
  const [model, setModel] = useState('')
  const [loading, setLoading] = useState(false)

const logSafe = (...args) => { try { if (typeof console !== 'undefined' && typeof console.log === 'function') console.log(...args) } catch (e) {} }

  const loadModels = async () => {
    setLoading(true)
    try {
      // Use the VisionStatus context (exposed via window helper) as single source of truth
      try {
        const s = (typeof window !== 'undefined' && window.__getVisionModelStatus) ? window.__getVisionModelStatus() : null
        const lmRaw = s?.loadedModels || null
        if (Array.isArray(lmRaw) && lmRaw.length > 0) {
          const lm = lmRaw.map(m => (typeof m === 'string' ? { name: m, loaded: true } : { name: m.name || m.model || String(m), loaded: true }))
          setModels(lm)
          logSafe('📡 Got loadedModels from vision context:', lm)

          // Ensure a sensible default model selection
          if (!model && lm.length > 0) {
            setModel(lm[0].name)
          }

          setLoading(false)
          return
        }
      } catch (statusErr) {
        logSafe(' vision context probe failed:', statusErr?.message || statusErr)
      }

      // Fallback: fetch available models list
      const res = await fetch('/api/ai/models')
      const data = await res.json()
      logSafe('📡 Respuesta de /api/ai/models:', data)
      // Prefer raw.available (objects with name/type/loaded/present) if present
      const available = (data?.raw && data.raw.available) ? data.raw.available : (data?.models || [])

      if (data?.ok && available) {
        setModels(available)
        logSafe(`✅ ${available.length} modelos cargados:`, available)



        // Seleccionar primer modelo si no hay uno seleccionado
        if (!model && available.length > 0) {
          // Prefer heuristic fallback if present
          const heuristic = available.find(m => (typeof m === 'object' && m.name === 'heuristic/parser'))
          if (heuristic) {
            setModel(heuristic.name)
            logSafe('🎯 Modelo seleccionado por defecto (heuristic):', heuristic.name)
          } else {
            // Prefer a model that is already loaded
            const loaded = available.find(m => (typeof m === 'object' && m.loaded))
            const chosen = loaded || available[0]
            const firstName = (typeof chosen === 'string') ? chosen : chosen.name
            setModel(firstName)
            logSafe('🎯 Modelo seleccionado por defecto:', firstName)
          }
        }
      } else {
        logSafe('❌ Error en respuesta:', data)
        setModels([])
      }
    } catch (e) {
      logSafe('❌ Error cargando modelos:', e)
      setModels([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { 
    console.log('🔄 AiProvider montado, cargando modelos...')
    loadModels() 

    // Listen for vision-status events to update models in real time
    if (typeof window !== 'undefined' && window.addEventListener) {
      const handler = (e) => {
        try {
          const lmRaw = e?.detail?.loadedModels || []
          if (Array.isArray(lmRaw) && lmRaw.length > 0) {
            const lm = lmRaw.map(m => (typeof m === 'string' ? { name: m, loaded: true } : { name: m.name || m.model || String(m), loaded: true }))
            setModels(lm)
            if (!model && lm.length > 0) setModel(lm[0].name)
            logSafe('🔁 AiProvider updated models from vision-status event:', lm)
          } else {
            // If empty, clear models to reflect current state
            setModels([])
            logSafe('🔁 AiProvider received empty model list from vision-status')
          }
        } catch (err) {
          logSafe('Error handling vision-status event', err)
        }
      }

      window.addEventListener('vision-status', handler)
      return () => { window.removeEventListener('vision-status', handler) }
    }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <AiContext.Provider value={{ models, model, setModel, refreshModels: loadModels, modelsLoading: loading }}>
      {children}
    </AiContext.Provider>
  )
}

export const useAiContext = () => {
  const ctx = useContext(AiContext)
  if (!ctx) throw new Error('useAiContext must be used within AiProvider')
  return ctx
}
