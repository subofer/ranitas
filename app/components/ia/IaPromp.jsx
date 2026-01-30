"use client"
import { useEffect, useState, useMemo, useRef, useCallback } from "react"
import IaChat from "./IaChat"
import IaImage from "./IaImage"
import FilterSelect from "../formComponents/FilterSelect"
import { useAiContext } from "@/context/AiContext"
import ModelStatusIndicator from "./ModelStatusIndicator"
import VisionControls from "./VisionControls"
import { useVisionStatusContext } from '@/context/VisionStatusContext'

// ========== CONSTANTES ==========
// Detecta modelos de visión (soporta variantes como qwen2.5vl, qwen-vl, etc.)
const VISION_RE = /(?:qwen.*vl|qwen-vl|vision|yol)/i
const TABS = [
  { id: 'chat', label: '💬 Chat', icon: '💬' },
  { id: 'image', label: '📸 Analizar imagen', icon: '📸' }
]

// ========== UTILIDADES ==========
const hasVision = (modelName) => {
  if (!modelName) return false
  return VISION_RE.test(modelName)
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
  const [showStatus, setShowStatus] = useState(false)
  const [status, setStatus] = useState(null)
  const [loadingStatus, setLoadingStatus] = useState(false)

  const fetchStatus = useCallback(async () => {
    setLoadingStatus(true)
    try {
      const res = await fetch('/api/ai/status')
      const j = await res.json()
      setStatus(j)
      setShowStatus(true)
    } catch (e) {
      setStatus({ error: String(e) })
      setShowStatus(true)
    } finally {
      setLoadingStatus(false)

    }
  }, [])

  return (
    <div className="bg-gradient-to-br from-yellow-50 to-orange-50 border-2 border-yellow-200 rounded-xl p-8 text-center shadow-sm">
      <div className="text-gray-400 mb-4">
        <span className="text-6xl">⚠️</span>
      </div>
      <h3 className="text-xl font-bold text-gray-900 mb-3">
        No hay modelos de IA locales disponibles
      </h3>
      <p className="text-gray-600 mb-6 max-w-md mx-auto">
        Para usar esta funcionalidad el microservicio `vision` (ranitas-vision) debe estar corriendo. El contenedor puede exportar subsistemas (por ejemplo YOLO para visión o un componente LLM) que se reportan por `/status`. La interfaz muestra únicamente lo que el servicio informa como disponible.
      </p>

      <div className="flex justify-center gap-2 mb-4">
        <button onClick={fetchStatus} disabled={loadingStatus} className="px-3 py-1 rounded bg-gray-50 border border-gray-100 text-sm text-gray-700 hover:bg-gray-100">{loadingStatus ? 'Consultando…' : 'Ver estado del servicio'}</button>
        <button onClick={() => window.open('https://docs.ranitas.local/README','_blank')} className="px-3 py-1 rounded bg-gray-50 border border-gray-100 text-sm text-gray-700 hover:bg-gray-100">Documentación</button>
      </div>

      {showStatus && status && (
        <div className="bg-white rounded-lg p-4 text-left font-mono text-sm border-2 border-gray-200 max-w-lg mx-auto shadow-inner">
          <div className="text-xs text-gray-500 mb-2">Respuesta de `/api/ai/status`</div>
          <pre className="whitespace-pre-wrap text-xs text-gray-800">{JSON.stringify(status, null, 2)}</pre>
        </div>
      )}

      <div className="bg-white rounded-lg p-5 text-left font-mono text-sm space-y-2 border-2 border-gray-200 max-w-lg mx-auto shadow-inner mt-4">
        <div className="text-gray-500 font-sans font-semibold text-xs uppercase tracking-wide mb-3">
          📋 Comandos de instalación:
        </div>
        <div className="flex items-center gap-2">
          <span className="text-gray-400">#</span>
          <span className="text-gray-700">Para análisis de imágenes:</span>
        </div>
        <div className="bg-gray-50 px-3 py-2 rounded border border-gray-200">
          <span className="text-blue-600">docker compose up -d vision</span>
          <span className="text-gray-500 ml-2">(verifica que Qwen esté en /app/models o que QWEN_MODEL apunte al repo)</span>
        </div>
        
        <div className="flex items-center gap-2 mt-4">
          <span className="text-gray-400">#</span>
          <span className="text-gray-700">Para chat de código:</span>
        </div>
        <div className="bg-gray-50 px-3 py-2 rounded border border-gray-200">
          <span className="text-blue-600">docker compose up -d vision</span>
          <span className="text-gray-500 ml-2">(asegúrate que qwen2.5-coder esté disponible en el contenedor)</span>
        </div>
      </div>
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
  preloadProgress,
  tab,
  setTab,
  minimalHeader = true
}) {
  // Usar el contexto para reflejar estado real de los servicios Docker (IA/DB)
  const { loadedModels, refresh, probeState, statusInfo, dockerServices } = useVisionStatusContext()

  return (
    <div className="bg-white shadow-lg rounded-xl border-2 border-gray-200 p-3 ia-control-header">
      <div className="flex items-start gap-2">
        <div className="flex flex-col">
          <div className="flex items-center gap-2 mb-1">
            {/* Controles mínimos incrustados en el header: icono Docker, nombre de contenedor, play/restart + stop */}
            <VisionControls minimal />

              {/* Ollama badge: only when Ollama info exists and there's something relevant (ready or model loaded) */}

          </div>

          <div className="flex items-start gap-3">
            <div className="flex flex-col gap-0.5">
              <div className="flex flex-col gap-1 w-full">
                {!minimalHeader && (loadedModels && loadedModels.length > 0) ? (
                  // Mostrar exactamente lo que el servicio reporta: nombre a la izquierda, tilde al final (alineado a la derecha)
                  loadedModels.map((lm, idx) => {
                    const name = lm.name || (typeof lm === 'string' ? lm : String(lm))
                    const loaded = !!lm.loaded
                    return (
                      <div key={name + idx} className={`flex items-center justify-between text-sm px-2 py-1 rounded bg-transparent text-gray-700 min-w-[220px]`} title={name}>
                        <span className="truncate block mr-2">{name}</span>
                        <span className={`text-green-600 font-semibold ${loaded ? '' : 'invisible'}`} aria-hidden>{loaded ? '✓' : ''}</span>
                      </div>
                    )
                  })
                ) : (
                  <div className="text-xs text-gray-400">&nbsp;</div>
                )}

                {probeState === 'error' && (
                  <div className="text-xs text-red-600 mt-2 flex items-center gap-2">
                    <span>Error al consultar servicio local</span>
                    <button onClick={() => refresh()} className="text-xs underline">Refrescar</button>
                  </div>
                )}
              </div>

            </div>

          </div>
        </div>

        <div className="ml-auto flex flex-col items-end">
          <div className="text-xs text-gray-500 font-medium mb-2">Seleccione herramienta</div>
          <TabSelector activeTab={tab} onChange={setTab} />
        </div>
      </div>
    </div>
  )
}

// ========== COMPONENTE PRINCIPAL ==========
const IaPrompt = () => {
  const { models, model, setModel, refreshModels, modelsLoading } = useAiContext()
  const { loadedModels, probeState, statusInfo } = useVisionStatusContext()
  const [tab, setTab] = useState('image')
  const [preloading, setPreloading] = useState(false)
  const [preloadProgress, setPreloadProgress] = useState({ total: 0, done: 0, current: null })
  
  // Evitar cargas repetidas en montados sucesivos
  const autoLoadStartedRef = useRef(false)

  const preloadModel = async () => {
    if (!model || preloading) return

    if (typeof setPreloading === 'function') setPreloading(true)
    else console.warn('setPreloading is not a function in preloadModel', typeof setPreloading)
    
    // Aumentar frecuencia de polling temporalmente
    const originalInterval = window.__visionPollingInterval
    if (typeof window.__setVisionPollingInterval === 'function') {
      window.__setVisionPollingInterval(500) // Polling cada 500ms durante carga
    }
    
    try {
      // Pedir al microservicio 'vision' que cargue el modelo seleccionado
      await fetch('/api/ai/models', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model })
      })

      // Esperar un poco más para que el polling detecte el cambio en vision
      await new Promise(resolve => setTimeout(resolve, 2000))
    } catch (error) {
      console.error('Error al precargar modelo:', error)
    } finally {
      if (typeof setPreloading === 'function') setPreloading(false)
      else console.warn('setPreloading is not a function in preloadModel finally', typeof setPreloading)
      
      // Restaurar frecuencia de polling original después de 5 segundos
      setTimeout(() => {
        if (typeof window.__setVisionPollingInterval === 'function' && originalInterval) {
          window.__setVisionPollingInterval(originalInterval)
        }
      }, 5000)
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
        preloadProgress={preloadProgress}
        tab={tab}
        setTab={setTab}
        minimalHeader={true}
      />

      <div className="bg-white shadow-lg rounded-xl border-2 border-gray-200 p-6">
        {/* Show NoModelsMessage only when the service is not running and we're not waiting for a response */}
        {!model && !modelsLoading && models.length === 0 && !((probeState === 'waiting') || (statusInfo && statusInfo.container && statusInfo.container.container_running)) && <NoModelsMessage />}
        
        {/* If we have a model selected or the service is up, render the tabs so the page can load */}
        {(model || models.length > 0 || (statusInfo && statusInfo.container && statusInfo.container.container_running)) && (
          <>
            {tab === 'chat' && <IaChat model={model} />}
            {tab === 'image' && <IaImage model={model} preloadModel={preloadModel} />}
          </>
        )}
      </div>
    </div>
  )
}

export default IaPrompt
