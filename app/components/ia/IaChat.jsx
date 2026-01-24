"use client"
import { useState, useEffect, useRef } from 'react'
import { useAiChat } from '@/hooks/useAiChat'

export default function IaChat({ model }) {
  const { messages, send, loading, stop, clear } = useAiChat({ model })
  const [input, setInput] = useState('')
  const messagesEndRef = useRef(null)
  const inputRef = useRef(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleSend = async () => {
    if (!input.trim() || !model) return
    await send(input)
    setInput('')
    inputRef.current?.focus()
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="grid gap-4">
      {/* Área de mensajes */}
      <div className="h-96 overflow-auto border border-gray-200 rounded-lg bg-gray-50 p-4">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="text-gray-400 mb-4">
              <span className="text-6xl">🤖</span>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Chat con IA</h3>
            <p className="text-gray-600">Escribe un mensaje para comenzar</p>
            {!model && (
              <div className="mt-4 bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-sm text-gray-700">
                ⚠️ Selecciona un modelo primero
              </div>
            )}
          </div>
        )}
        
        {messages.map((m, i) => (
          <div 
            key={i} 
            className={`mb-4 flex ${
              m.role === 'user' ? 'justify-end' : 'justify-start'
            }`}
          >
            <div 
              className={`max-w-[80%] rounded-lg px-4 py-3 ${
                m.role === 'user' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-white border border-gray-200 text-gray-900'
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <span className="text-lg">
                  {m.role === 'user' ? '👤' : '🤖'}
                </span>
                <span className={`text-xs ${
                  m.role === 'user' ? 'text-blue-100' : 'text-gray-500'
                }`}>
                  {m.role === 'user' ? 'Tú' : model || 'Asistente'}
                </span>
              </div>
              <div className="whitespace-pre-wrap break-words leading-relaxed text-sm">
                {m.text}
              </div>
            </div>
          </div>
        ))}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Controles */}
      <div className="flex gap-2">
        <button 
          className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50 transition-colors flex items-center"
          onClick={clear}
          disabled={messages.length === 0 || loading}
        >
          <span className="mr-1">🗑️</span> Limpiar
        </button>
        
        <div className="flex-1 flex gap-2">
          <textarea
            ref={inputRef}
            className="flex-1 border border-gray-300 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={model ? "Escribe tu mensaje... (Enter para enviar, Shift+Enter para nueva línea)" : "Selecciona un modelo primero"}
            rows={2}
            disabled={!model || loading}
          />
          
          <div className="flex flex-col gap-2">
            {loading && (
              <button 
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center"
                onClick={stop}
              >
                <span className="mr-1">⏹️</span> Detener
              </button>
            )}
            
            <button 
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex-1 flex items-center justify-center gap-2"
              disabled={loading || !input.trim() || !model}
              onClick={handleSend}
            >
              {loading ? (
                <>
                  <span className="animate-spin">⏳</span>
                  Enviando...
                </>
              ) : (
                <>🚀 Enviar</>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Info */}
      {messages.length > 0 && (
        <div className="text-xs text-gray-500 text-center">
          {messages.length} mensaje{messages.length !== 1 ? 's' : ''} • Modelo: {model || 'ninguno'}
        </div>
      )}
    </div>
  )
}
