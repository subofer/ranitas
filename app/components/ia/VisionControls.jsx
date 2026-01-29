"use client"
import { useState, useMemo } from 'react'
import { useVisionStatusContext } from '@/context/VisionStatusContext'
import DockerServiceBlock from './DockerServiceBlock'

export default function VisionControls({ minimal = false }) {
  const { loadedModels = [], refresh, probeState, statusInfo } = useVisionStatusContext()
  const [running, setRunning] = useState(false)
  const [lastOutput, setLastOutput] = useState(null)
  const [error, setError] = useState(null)
  const [showContainerDebug, setShowContainerDebug] = useState(false)

  // Simplified actions for minimal UI: display container name with play/stop icons to the right
  // Consider the service running if there are loadedModels, or if subsystems report themselves as ready
  const isRunning = Boolean((loadedModels && loadedModels.length > 0) || statusInfo?.yolo?.loaded)

  const callAction = async (action) => {
    setRunning(true)
    setError(null)
    setLastOutput(null)
    try {
      const resp = await fetch('/api/ai/vision-control', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action })
      })
      const data = await resp.json()
      if (!resp.ok) throw new Error(data?.error || 'Error en acción')
      setLastOutput(data.output || data.message || 'OK')
      try {
        const { auditAction } = await import('@/lib/actions/audit')
        auditAction({ level: 'INFO', category: 'IA', action: 'CONTROL_VISION', message: `Action: ${action}`, metadata: { action } }).catch(()=>{})
      } catch (auditErr) {
        console.warn('No se pudo registrar auditoría de control vision:', auditErr)
      }

      // Refresh immediately so UI reflects new state as soon as possible
      try { await refresh() } catch (e) { /* ignore */ }
    } catch (err) {
      console.error('Vision control error', err)
      setError(err.message || String(err))
      try {
        const { auditAction } = await import('@/lib/actions/audit')
        auditAction({ level: 'ERROR', category: 'IA', action: 'CONTROL_VISION', message: `Action failed: ${action}`, metadata: { action, error: String(err) } }).catch(()=>{})
      } catch (auditErr) {
        console.warn('No se pudo registrar auditoría de fallo:', auditErr)
      }
    } finally {
      setRunning(false)
    }
  }

  // Minimal layout: show container name with docker icon and subtle play/restart/stop controls
  if (minimal) {
    const containerName = statusInfo?.container?.name || statusInfo?.container?.container_candidate || 'ranitas-vision'
    const containerImage = statusInfo?.container?.image || null
    const containerRunning = !!statusInfo?.container?.container_running

    const formatImageShort = (img) => {
      if (!img) return null
      try {
        // keep only last segment (user/repo:tag -> repo:tag)
        const last = img.split('/').pop()
        if (!last) return null
        // if last equals containerName or contains it as prefix, avoid duplication
        if (containerName && (last === containerName || last.startsWith(containerName + ':') || last.includes(containerName))) {
          // try to extract tag only
          const parts = last.split(':')
          const tag = parts.length > 1 ? parts.slice(1).join(':') : null
          return tag || null
        }
        // if last equals image string, return it
        return last
      } catch (e) { return img }
    }

    const imageDisplay = formatImageShort(containerImage)

    return (
      <>
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2">
              {/* Clean Docker whale icon — single-color, no shadow */}
              <svg
                width="20" height="20" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"
                className={`${containerRunning ? 'text-[#2496ED]' : 'text-gray-400'} transition-colors duration-200 bg-transparent shadow-none`}
                fill="currentColor"
                aria-hidden="true"
              >
                <path d="M22 12c0 2.8-2.2 5-5 5h-1c-1.7 0-3.3.9-4.2 2.3-.3.4-1 .4-1.3 0C9.3 18.9 7.7 18 6 18H5c-2.8 0-5-2.2-5-5 0-1.7 1-3 2.2-3.9C3.8 8.9 6 8 8.8 8c2.4 0 4.5 1 6 3 0 .1.6.1.6.1h.4c2.8 0 5 2.2 5 5z" />
              </svg>

              <div className="text-sm font-medium flex items-baseline gap-2">
                <span>{containerName}</span>
                {imageDisplay && <span className="text-xs text-gray-500">{imageDisplay}</span>}
                {/* Status dot: green=running+models, orange=container running but no models, red=not running */}
                <span
                  aria-hidden
                  title={containerRunning ? (loadedModels && loadedModels.length > 0 ? 'Online' : 'Starting') : 'Offline'}
                  className={`ml-2 inline-block h-2 w-2 rounded-full ${containerRunning ? (loadedModels && loadedModels.length > 0 ? 'bg-green-500' : 'bg-yellow-400') : 'bg-red-500'}`}
                />
              </div>
            </div>

            <div className="ml-2 flex items-center gap-1 text-xs text-gray-500">
              {containerRunning ? (
                <button onClick={() => callAction('restart')} disabled={running} title="Reiniciar" aria-label="Reiniciar" className="hover:underline">[Reiniciar]</button>
              ) : (
                <button onClick={() => callAction('start')} disabled={running} title="Iniciar" aria-label="Iniciar" className="hover:underline">[Iniciar]</button>
              )}

              <button onClick={() => callAction('stop')} disabled={running} title="Detener" aria-label="Detener" className="hover:underline">[Detener]</button>

              <button onClick={async () => {
                setRunning(true)
                setLastOutput(null)
                try {
                  await refresh()
                  const proxy = await fetch('/api/ai/status')
                  if (proxy && proxy.ok) {
                    const j = await proxy.json()
                    setLastOutput(JSON.stringify({ source: 'proxy', ...j }, null, 2))
                    setShowContainerDebug(true)
                  } else {
                    setLastOutput('No response from /api/ai/status')
                    setShowContainerDebug(true)
                  }
                } catch (e) {
                  setLastOutput(String(e))
                  setShowContainerDebug(true)
                } finally {
                  setRunning(false)
                }
              }} className="hover:underline">[Forzar]</button>
            </div>

            {statusInfo?.container?.docker_probe && (
              <button onClick={() => setShowContainerDebug(s => !s)} className="text-xs px-2 py-1 rounded bg-gray-50 border border-gray-100 hover:bg-gray-100">📡</button>
            )}
          </div>

          {/* Reserve space to avoid layout jumps when showing the waiting indicator */}



        </div>
      </>
    )
  }

  return (
    <div className="flex flex-col items-end gap-4">
      <div className="w-full flex flex-col gap-3">
        {/* DB block above IA */}
        <div>
          <div className="text-xs text-gray-500 font-medium mb-1">Database</div>
          <div className="px-3 py-2 bg-white rounded border border-gray-100 shadow-sm">
            <DockerServiceBlock target="db" label="Postgres" />
          </div>
        </div>

        {/* IA block (vision) */}
        <div>
          <div className="text-xs text-gray-500 font-medium mb-1">Servicio vision</div>
          <div className="px-3 py-2 bg-white rounded border border-gray-100 shadow-sm">
            <DockerServiceBlock target="vision" label="Ranitas Vision" />
            <div className="mt-2">
              <div className={`px-3 py-1 rounded-md text-xs font-medium ${loadedModels && loadedModels.length > 0 ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-gray-50 text-gray-600 border border-gray-200'}`}>
                {loadedModels && loadedModels.length > 0 ? `OK • ${loadedModels.length} modelo${loadedModels.length !== 1 ? 's' : ''}` : 'No disponible'}
              </div>
            </div>
          </div>
        </div>
      </div>

      {statusInfo?.container?.docker_probe && (
        <button onClick={() => setShowContainerDebug(s => !s)} className="px-2 py-1 rounded bg-gray-50 text-gray-700 text-sm border border-gray-100 hover:bg-gray-100">📡</button>
      )}

      {running && <div className="text-xs text-gray-500 mt-1">Ejecutando...</div>}
      {lastOutput && (
        <pre className="mt-2 max-w-2xl overflow-auto bg-gray-50 p-2 rounded text-xs text-gray-800 border border-gray-100 whitespace-pre-wrap">{lastOutput}</pre>
      )}
      {error && <div className="text-xs text-red-600 mt-1">{error}</div>}
    </div>
  )
}
