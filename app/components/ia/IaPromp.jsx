"use client"
import { useEffect, useState, useMemo } from "react"
import IaChat from "./IaChat"
import IaImage from "./IaImage"
import FilterSelect from "../formComponents/FilterSelect"
import { useAiContext } from "@/context/AiContext"
import ModelStatusIndicator from "./ModelStatusIndicator"

// ========== CONSTANTES ==========
const VISION_KEYWORDS = ['vision', 'llava', 'bakllava', 'minicpm-v', 'cogvlm', 'qwen-vl', 'yi-vl']

const TABS = [
  { id: 'chat', label: '💬 Chat', icon: '💬' },
  { id: 'image', label: '📸 Analizar imagen', icon: '📸' }
]

// ========== UTILIDADES ==========
const hasVision = (modelName) => {
  if (!modelName) return false
  return VISION_KEYWORDS.some(keyword => modelName.toLowerCase().includes(keyword))
}

// ========== COMPONENTES ==========

// Selector de pestañas
function TabSelector({ activeTab, onChange }) {
  return (
    <div className="flex gap-2">
      {TABS.map((tab) => (
        <button
          key={tab.id}
          className={`px-4 py-2 rounded-lg font-bold transition-all ${
            activeTab === tab.id
              ? 'bg-blue-600 text-white shadow-lg border-2 border-blue-700'
              : 'bg-gray-50 text-gray-700 hover:bg-gray-100 hover:text-gray-900 border-2 border-gray-200'
          }`}
          onClick={() => onChange(tab.id)}
        >
          {tab.label}
        </button>
      ))}
    </div>
  )
}

// Mensaje de bienvenida cuando no hay modelos
function NoModelsMessage() {
  return (
    <div className="bg-gradient-to-br from-yellow-50 to-orange-50 border-2 border-yellow-200 rounded-xl p-8 text-center shadow-sm">
      <div className="text-gray-400 mb-4">
        <span className="text-6xl">⚠️</span>
      </div>
      <h3 className="text-xl font-bold text-gray-900 mb-3">
        No hay modelos Ollama disponibles
      </h3>
      <p className="text-gray-600 mb-6 max-w-md mx-auto">
        Para usar esta funcionalidad necesitas tener Ollama corriendo con al menos un modelo instalado.
      </p>
      <div className="bg-white rounded-lg p-5 text-left font-mono text-sm space-y-2 border-2 border-gray-200 max-w-lg mx-auto shadow-inner">
        <div className="text-gray-500 font-sans font-semibold text-xs uppercase tracking-wide mb-3">
          📋 Comandos de instalación:
        </div>
        <div className="flex items-center gap-2">
          <span className="text-gray-400">#</span>
          <span className="text-gray-700">Para análisis de imágenes:</span>
        </div>
        <div className="bg-gray-50 px-3 py-2 rounded border border-gray-200">
          <span className="text-blue-600">ollama pull</span>{' '}
          <span className="text-purple-600">llava</span>
        </div>
        
        <div className="flex items-center gap-2 mt-4">
          <span className="text-gray-400">#</span>
          <span className="text-gray-700">Para chat de código:</span>
        </div>
        <div className="bg-gray-50 px-3 py-2 rounded border border-gray-200">
          <span className="text-blue-600">ollama pull</span>{' '}
          <span className="text-purple-600">qwen2.5-coder:7b</span>
        </div>
      </div>
    </div>
  )
}

// Selector de modelos con select HTML nativo
function ModelSelector({ 
  models, 
  selectedModel, 
  onModelChange, 
  modelsLoading, 
  onRefresh 
}) {
  // Organizar modelos: con visión primero, luego sin visión
  const sortedModels = useMemo(() => {
    if (!models || models.length === 0) return []
    
    const withVision = models.filter(m => hasVision(m))
    const withoutVision = models.filter(m => !hasVision(m))
    
    return [...withVision, ...withoutVision]
  }, [models])
  
  return (
    <div className="flex items-center gap-2">
      <div className="text-xs text-gray-500 font-medium whitespace-nowrap">
        🤖 {modelsLoading ? 'Cargando...' : `${models.length} modelo${models.length !== 1 ? 's' : ''}`}
      </div>
      
      <select
        value={selectedModel || ''}
        onChange={(e) => onModelChange(e.target.value)}
        disabled={modelsLoading || models.length === 0}
        className="px-3 py-2 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
        style={{ width: '220px' }}
      >
        <option value="">Selecciona un modelo</option>
        {sortedModels.map(modelName => (
          <option key={modelName} value={modelName}>
            {hasVision(modelName) ? '👁️' : '💬'} {modelName}
          </option>
        ))}
      </select>
      
      <button
        className="text-gray-500 hover:text-blue-600 transition-colors disabled:opacity-50 p-1.5 rounded-lg hover:bg-gray-100 flex-shrink-0"
        onClick={onRefresh}
        disabled={modelsLoading}
        title="Refrescar lista de modelos"
      >
        <span className={modelsLoading ? 'inline-block animate-spin' : ''}>
          {modelsLoading ? '⏳' : '🔄'}
        </span>
      </button>
    </div>
  )
}

// Encabezado principal con controles
function ControlHeader({
  models,
  model,
  setModel,
  modelsLoading,
  refreshModels,
  preloadModel,
  preloading,
  tab,
  setTab
}) {
  return (
    <div className="bg-white shadow-lg rounded-xl border-2 border-gray-200 p-5">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 flex-shrink-0" style={{ maxWidth: '300px' }}>
          <ModelSelector
            models={models}
            selectedModel={model}
            onModelChange={setModel}
            modelsLoading={modelsLoading}
            onRefresh={refreshModels}
          />
          <ModelStatusIndicator
            modelName={model}
            onPreload={preloadModel}
            preloading={preloading}
          />
        </div>
        
        <div className="ml-auto">
          <TabSelector activeTab={tab} onChange={setTab} />
        </div>
      </div>
    </div>
  )
}

// ========== COMPONENTE PRINCIPAL ==========
const IaPrompt = () => {
  const { models, model, setModel, refreshModels, modelsLoading } = useAiContext()
  const [tab, setTab] = useState('chat')
  const [preloading, setPreloading] = useState(false)

  useEffect(() => {
    // Asegurar que los modelos estén cargados
  }, [models])

  const preloadModel = async () => {
    if (!model || preloading) return

    setPreloading(true)
    try {
      // Petición mínima para forzar la carga del modelo
      await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: model,
          prompt: 'hi' // Mensaje mínimo
        })
      })

      // El estado se actualizará automáticamente por el contexto
      await new Promise(resolve => setTimeout(resolve, 1000))
    } catch (error) {
      console.error('Error al precargar modelo:', error)
    } finally {
      setPreloading(false)
    }
  }

  return (
    <div className="grid gap-5 p-4">
      <ControlHeader
        models={models}
        model={model}
        setModel={setModel}
        modelsLoading={modelsLoading}
        refreshModels={refreshModels}
        preloadModel={preloadModel}
        preloading={preloading}
        tab={tab}
        setTab={setTab}
      />

      <div className="bg-white shadow-lg rounded-xl border-2 border-gray-200 p-6">
        {!model && !modelsLoading && models.length === 0 && <NoModelsMessage />}
        
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

export default IaPrompt
