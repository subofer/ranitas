"use client"
import { useEffect, useRef, useState } from 'react'
import logger from '@/lib/logger'

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
      logger.warn(`Falta texto o modelo: model=${model} textLength=${text?.length || 0}`, '[useAiChat]')
      return
    }
    
    logger.debug({ action: 'send', model, textLength: text.length }, '[useAiChat]')
    
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

      logger.debug({ status: res.status, ok: res.ok }, '[useAiChat]')

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        const errorMsg = `Error ${res.status}: ${data?.error || res.statusText}`
        logger.error(errorMsg, '[useAiChat]')
        setMessages((m) => {
          const copy = [...m]
          copy[copy.length - 1] = { role: 'assistant', text: errorMsg }
          return copy
        })
        return
      }

      if (!res.body) {
        logger.warn('Sin body en respuesta; fallback to JSON', '[useAiChat]')
        const data = await res.json()
        setMessages((m) => {
          const copy = [...m]
          copy[copy.length - 1] = { role: 'assistant', text: data.text || 'Sin respuesta' }
          return copy
        })
        return
      }

      // Streaming
      logger.info('Iniciando streaming...', '[useAiChat]')
      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let assistantText = ''
      let lastIndex = null
      let isFirstChunk = true

      while (true) {
        const { done, value } = await reader.read()
        if (done) {
          logger.info(`Stream completo. Total caracteres: ${assistantText.length}`, '[useAiChat]')
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
          logger.info('Modelo cargado, iniciando generación', '[useAiChat]')
        }
      }

    } catch (e) {
      if (e.name === 'AbortError') {
        logger.info('Stream cancelado por usuario', '[useAiChat]')
        setMessages((m) => {
          const copy = [...m]
          copy[copy.length - 1] = { role: 'assistant', text: '⏹️ [Cancelado por usuario]' }
          return copy
        })
      } else {
        logger.error(`Error en send: ${e}`, '[useAiChat]')
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
