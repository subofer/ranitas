"use client"
import React, { createContext, useContext, useEffect, useState } from 'react'

const AiContext = createContext(null)

export function AiProvider({ children }) {
  const [models, setModels] = useState([])
  const [model, setModel] = useState('')
  const [loading, setLoading] = useState(false)

  const loadModels = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/ai/models')
      const data = await res.json()
      
      console.log('📡 Respuesta de /api/ai/models:', data)
      
      if (data?.ok && data.models) {
        setModels(data.models)
        console.log(`✅ ${data.models.length} modelos cargados:`, data.models)
        
        // Seleccionar primer modelo si no hay uno seleccionado
        if (!model && data.models.length > 0) {
          setModel(data.models[0])
          console.log('🎯 Modelo seleccionado por defecto:', data.models[0])
        }
      } else {
        console.error('❌ Error en respuesta:', data)
        setModels([])
      }
    } catch (e) {
      console.error('❌ Error cargando modelos:', e)
      setModels([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { 
    console.log('🔄 AiProvider montado, cargando modelos...')
    loadModels() 
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
