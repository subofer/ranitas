"use client"
import { useEffect, useRef, useState } from 'react'

export function useAiChat({ model }) {
  const [messages, setMessages] = useState([])
  const [loading, setLoading] = useState(false)
  const controllerRef = useRef(null)

  useEffect(() => {
    return () => {
      if (controllerRef.current) controllerRef.current.abort()
    }
  }, [])

  const clear = () => setMessages([])

  const send = async (text) => {
    if (!text || !model) {
      console.error('❌ Falta texto o modelo:', { text, model })
      return
    }
    
    console.log('📤 Enviando mensaje:', { model, textLength: text.length })
    
    setMessages((m) => [...m, { role: 'user', text }])
    setLoading(true)
    
    // Mostrar mensaje de carga si el modelo no está en VRAM
    const loadingMsgIndex = messages.length + 1
    setMessages((m) => [...m, { role: 'assistant', text: '⏳ Cargando modelo en VRAM...', loading: true }])
    
    controllerRef.current && controllerRef.current.abort()
    const controller = new AbortController()
    controllerRef.current = controller

    try {
      const res = await fetch('/api/ai/chat', { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify({ model, prompt: text }), 
        signal: controller.signal 
      })

      console.log('📡 Respuesta recibida:', { status: res.status, ok: res.ok })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        const errorMsg = `Error ${res.status}: ${data?.error || res.statusText}`
        console.error('❌', errorMsg)
        setMessages((m) => {
          const copy = [...m]
          copy[copy.length - 1] = { role: 'assistant', text: errorMsg }
          return copy
        })
        return
      }

      if (!res.body) {
        console.warn('⚠️ Sin body en respuesta, intentando JSON')
        const data = await res.json()
        setMessages((m) => {
          const copy = [...m]
          copy[copy.length - 1] = { role: 'assistant', text: data.text || 'Sin respuesta' }
          return copy
        })
        return
      }

      // Streaming
      console.log('📊 Iniciando streaming...')
      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let assistantText = ''
      let lastIndex = null
      let isFirstChunk = true

      while (true) {
        const { done, value } = await reader.read()
        if (done) {
          console.log('✅ Stream completo. Total caracteres:', assistantText.length)
          break
        }
        const chunk = decoder.decode(value, { stream: true })
        assistantText += chunk
        
        setMessages((m) => {
          const copy = [...m]
          if (lastIndex === null) {
            for (let i = copy.length - 1; i >= 0; i--) { 
              if (copy[i].role === 'assistant') { 
                lastIndex = i
                break 
              } 
            }
          }
          if (lastIndex === null) {
            copy.push({ role: 'assistant', text: assistantText })
            lastIndex = copy.length - 1
          } else {
            copy[lastIndex] = { role: 'assistant', text: assistantText }
          }
          return copy
        })
        
        // Remover mensaje de carga en el primer chunk
        if (isFirstChunk) {
          isFirstChunk = false
          console.log('🚀 Modelo cargado, iniciando generación')
        }
      }

    } catch (e) {
      if (e.name === 'AbortError') {
        console.log('⏹️ Stream cancelado por usuario')
        setMessages((m) => {
          const copy = [...m]
          copy[copy.length - 1] = { role: 'assistant', text: '⏹️ [Cancelado por usuario]' }
          return copy
        })
      } else {
        console.error('❌ Error en send:', e)
        setMessages((m) => {
          const copy = [...m]
          copy[copy.length - 1] = { role: 'assistant', text: `❌ Error: ${e.message}` }
          return copy
        })
      }
    } finally {
      setLoading(false)
      controllerRef.current = null
    }
  }

  const stop = () => {
    if (controllerRef.current) controllerRef.current.abort()
    controllerRef.current = null
    setLoading(false)
  }

  return { messages, send, loading, clear, stop }
}
