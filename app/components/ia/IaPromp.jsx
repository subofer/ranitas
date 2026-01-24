"use client"
import { useEffect, useState } from "react";
import IaChat from "./IaChat";
import IaImage from "./IaImage";
import { useAiContext } from "@/context/AiContext";
import { useOllamaStatus } from "@/hooks/useOllamaStatus";

const IaPrompt = () => {
  const { models, model, setModel, refreshModels, modelsLoading } = useAiContext()
  const { loadedModels, modelStatus, refresh } = useOllamaStatus({ selectedModel: model })
  const [tab, setTab] = useState('chat')
  const [preloading, setPreloading] = useState(false)

  useEffect(() => {
    // ensure models are loaded by context
  }, [models])

  const preloadModel = async () => {
    if (!model || preloading) return
    
    setPreloading(true)
    try {
      // Hacer una petición mínima para forzar la carga del modelo
      await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: model,
          prompt: 'hi' // Mensaje mínimo para activar el modelo
        })
      })
      
      // Esperar un momento y refrescar el estado
      setTimeout(() => {
        refresh()
      }, 1000)
    } catch (error) {
      console.error('Error al precargar modelo:', error)
    } finally {
      setPreloading(false)
    }
  }

  return (
    <div className="grid gap-4">
      <div className="flex items-center gap-4 bg-white shadow-lg rounded-xl border border-gray-200 p-4">
        <div className="flex-1">
          <div className="text-sm text-gray-600 mb-1 font-medium">Modelo Ollama</div>
          <div className="flex items-center gap-3">
            <select 
              className="border border-gray-300 p-2 rounded-lg w-72 disabled:opacity-50 disabled:bg-gray-100 text-gray-900" 
              value={model} 
              onChange={(e) => setModel(e.target.value)}
              disabled={modelsLoading || models.length === 0}
            >
              {modelsLoading && <option value="">⏳ Cargando modelos...</option>}
              {!modelsLoading && models.length === 0 && <option value="">❌ No hay modelos disponibles</option>}
              {!modelsLoading && models.map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
            <button 
              className="px-4 py-2 bg-gray-600 text-white hover:bg-gray-700 rounded-lg transition-colors disabled:opacity-50" 
              onClick={refreshModels}
              disabled={modelsLoading}
            >
              {modelsLoading ? '⏳ Cargando' : '🔄 Refrescar'}
            </button>
            <div className="text-sm text-gray-500">
              {modelsLoading ? 'Cargando...' : `${models.length} modelo${models.length !== 1 ? 's' : ''}`}
            </div>
          </div>
        </div>

        <div className="flex gap-2 ml-auto">
          <button 
            className={`px-4 py-2 rounded-lg transition-colors ${
              tab==='chat' 
                ? 'bg-blue-600 text-white' 
                : 'text-gray-600 hover:bg-gray-100'
            }`} 
            onClick={() => setTab('chat')}
          >
            💬 Chat
          </button>
          <button 
            className={`px-4 py-2 rounded-lg transition-colors ${
              tab==='image' 
                ? 'bg-blue-600 text-white' 
                : 'text-gray-600 hover:bg-gray-100'
            }`} 
            onClick={() => setTab('image')}
          >
            📸 Analizar imagen
          </button>
        </div>
      </div>

      <div className="bg-white shadow-lg rounded-xl border border-gray-200 p-6">
        {!model && !modelsLoading && models.length === 0 && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
            <div className="text-gray-400 mb-4">
              <span className="text-5xl">⚠️</span>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No hay modelos Ollama disponibles</h3>
            <p className="text-gray-600 mb-4">
              Para usar esta funcionalidad necesitas tener Ollama corriendo con al menos un modelo instalado.
            </p>
            <div className="bg-white rounded-lg p-4 text-left text-sm font-mono space-y-1 border border-gray-200 max-w-md mx-auto">
              <div className="text-gray-500"># Instalar un modelo:</div>
              <div className="text-gray-900">ollama pull llava</div>
              <div className="text-gray-500"># o</div>
              <div className="text-gray-900">ollama pull qwen2.5-coder:7b</div>
            </div>
          </div>
        )}
        
        {(model || models.length > 0) && (
          <>
            {tab === 'chat' && <IaChat model={model} />}
            {tab === 'image' && <IaImage model={model} />}
          </>
        )}
      </div>

      {/* Estado de GPU/VRAM */}
      {(model || models.length > 0) && (
        <div className="bg-white shadow-lg rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-medium text-gray-900 flex items-center gap-2">
              <span>💾</span>
              Estado de la GPU
            </h3>
            {loadedModels.length > 0 && (
              <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">
                {loadedModels.length} modelo{loadedModels.length !== 1 ? 's' : ''} en VRAM
              </span>
            )}
          </div>
          
          {/* Estado del modelo seleccionado */}
          {model && (
            <div className="mb-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${
                    modelStatus === 'loaded' ? 'bg-green-500 animate-pulse' : 'bg-gray-300'
                  }`}></div>
                  <span className="text-sm font-medium text-gray-900">{model}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="text-xs text-gray-600">
                    {modelStatus === 'loaded' && '✅ Cargado en VRAM'}
                    {modelStatus === 'unloaded' && '⏳ No cargado'}
                    {!modelStatus && '🔄 Verificando...'}
                  </div>
                  {modelStatus === 'unloaded' && (
                    <button
                      onClick={preloadModel}
                      disabled={preloading}
                      className="text-xs px-2 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      title="Cargar modelo en VRAM ahora"
                    >
                      {preloading ? '⏳ Cargando...' : '⚡ Precargar'}
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
          
          {/* Lista de modelos cargados en VRAM */}
          {loadedModels.length > 0 ? (
            <div className="space-y-2">
              <div className="text-xs text-gray-500 font-medium">Modelos en memoria:</div>
              {loadedModels.map((m, idx) => (
                <div key={idx} className="flex items-center justify-between text-xs p-2 bg-blue-50 rounded border border-blue-100">
                  <span className="font-medium text-gray-900">{m.name}</span>
                  <div className="flex items-center gap-3">
                    <span className="text-gray-600">
                      VRAM: {(m.sizeVram / 1024 / 1024 / 1024).toFixed(2)} GB
                    </span>
                    <span className="bg-blue-200 text-blue-800 px-2 py-0.5 rounded-full">
                      Activo
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-4 text-gray-500 text-sm">
              <span className="text-2xl mb-2 block">🌙</span>
              No hay modelos cargados en VRAM
              <div className="text-xs mt-1">Se cargarán automáticamente al usarlos</div>
              {model && modelStatus === 'unloaded' && (
                <button
                  onClick={preloadModel}
                  disabled={preloading}
                  className="mt-3 text-xs px-3 py-1.5 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {preloading ? '⏳ Precargando...' : `⚡ Precargar ${model}`}
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default IaPrompt;