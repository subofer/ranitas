"use client"
import { useState, useMemo } from 'react'
import { useVisionStatusContext } from '@/context/VisionStatusContext'
import DockerStatusDisplay from './DockerStatusDisplay'

export default function VisionControls({ minimal = false }) {
  const { loadedModels = [], refresh, probeState, statusInfo, dockerServices } = useVisionStatusContext()
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
    // Render one DockerStatusDisplay per server (db + vision). The component will
    // use explicit container info when available, and reserve space when not.
    return (
      <>
        <div className="flex flex-col gap-1">
          <div className="w-full">
            <DockerStatusDisplay compact target="db" />
          </div>
          <div className="w-full">
            <DockerStatusDisplay compact target="vision" />
          </div>
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
            <DockerStatusDisplay controlsLeft target="db" />
          </div>
        </div>

        {/* IA block (vision) */}
        <div>
          <div className="text-xs text-gray-500 font-medium mb-1">Servicio vision</div>
          <div className="px-3 py-2 bg-white rounded border border-gray-100 shadow-sm">
            <DockerStatusDisplay controlsLeft target="vision" />

          </div>
        </div>
      </div>

      {/* docker probe debug toggle removed (redundant) */}

      {running && <div className="text-xs text-gray-500 mt-1">Ejecutando...</div>}
      {lastOutput && (
        <pre className="mt-2 max-w-2xl overflow-auto bg-gray-50 p-2 rounded text-xs text-gray-800 border border-gray-100 whitespace-pre-wrap">{lastOutput}</pre>
      )}
      {error && <div className="text-xs text-red-600 mt-1">{error}</div>}
    </div>
  )
}
