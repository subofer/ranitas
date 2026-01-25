"use client"
import { useEffect, useState, useMemo } from "react";
import IaChat from "./IaChat";
import IaImage from "./IaImage";
import FilterSelect from "../formComponents/FilterSelect";
import { useAiContext } from "@/context/AiContext";
import { useOllamaStatus } from "@/hooks/useOllamaStatus";

const IaPrompt = () => {
  const { models, model, setModel, refreshModels, modelsLoading } = useAiContext()
  const { loadedModels, modelStatus, refresh } = useOllamaStatus({ selectedModel: model })
  const [tab, setTab] = useState('chat')
  const [preloading, setPreloading] = useState(false)

  // Detectar modelos con capacidad de visión
  const hasVision = (modelName) => {
    const visionKeywords = ['vision', 'llava', 'bakllava', 'minicpm-v', 'cogvlm', 'qwen-vl', 'yi-vl']
    return visionKeywords.some(keyword => modelName.toLowerCase().includes(keyword))
  }

  // Organizar modelos: con visión primero, luego sin visión
  const sortedModels = useMemo(() => {
    if (!models) return []
    const withVision = models.filter(hasVision)
    const withoutVision = models.filter(m => !hasVision(m))
    return [...withVision, ...withoutVision]
  }, [models])

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
          <div className="text-sm text-gray-600 mb-1 font-medium flex items-center gap-2">
            Ollama - {modelsLoading ? 'Cargando...' : `${models.length} modelo${models.length !== 1 ? 's' : ''}`}
            <button 
              className="text-gray-500 hover:text-gray-700 transition-colors disabled:opacity-50 p-1 rounded hover:bg-gray-100" 
              onClick={refreshModels}
              disabled={modelsLoading}
              title="Refrescar lista de modelos"
            >
              {modelsLoading ? '⏳' : '🔄'}
            </button>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative w-96">
              <FilterSelect
                value={model}
                onChange={setModel}
                disabled={modelsLoading || models.length === 0}
                className="w-full"
              >
                {modelsLoading && <option value="">⏳ Cargando...</option>}
                {!modelsLoading && models.length === 0 && <option value="">❌ Sin modelos</option>}
                {!modelsLoading && sortedModels.map((m) => {
                  const isVision = hasVision(m)
                  return (
                    <option key={m} value={m} className={isVision ? 'font-medium' : 'text-gray-400'}>
                      {isVision ? '👁️ ' : '💬 '}{m}
                    </option>
                  )
                })}
              </FilterSelect>
              {model && modelStatus === 'loaded' && (
                <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none">
                  <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                </div>
              )}
            </div>
            {model && modelStatus === 'unloaded' && (
              <button onClick={preloadModel} disabled={preloading} className="px-3 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 text-sm" title="Cargar en VRAM">
                {preloading ? '⏳' : '⚡'}
              </button>
            )}
            {model && modelStatus === 'loaded' && (
              <div className="px-3 py-2 bg-green-100 text-green-700 rounded-lg text-sm whitespace-nowrap">En VRAM</div>
            )}
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
    </div>
  )
}

export default IaPrompt;