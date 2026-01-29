"use client"
import { useState } from 'react'
import { useVisionStatusContext } from '@/context/VisionStatusContext'

export default function DockerServiceBlock({ target = 'vision', label = 'Service', compact = false, controlsLeft = false }) {
  const { loadedModels = [], refresh, getServiceInfo, startService, stopService, restartService, logsService, statusInfo } = useVisionStatusContext()
  const [running, setRunning] = useState(false)
  const [lastOutput, setLastOutput] = useState(null)
  const [showDebug, setShowDebug] = useState(false)

  const svc = getServiceInfo && getServiceInfo(target) ? getServiceInfo(target) : {}
  // Use only explicit container fields or the stable `target` placeholder to avoid
  // SSR/client hydration mismatches caused by server-only environment variables.
  const name = svc?.name || svc?.container_candidate || target
  const image = svc?.image || null
  const health = svc?.health || null
  const isRunning = Boolean(svc?.container_running)

  // Derive IA models to display (prefer explicit loadedModels, fallback to statusInfo details)
  let iaModels = []
  if (target === 'vision') {
    if (Array.isArray(loadedModels) && loadedModels.length > 0) iaModels = loadedModels.map(m => (typeof m === 'string' ? m : (m.name || m.model || String(m))))
    if (iaModels.length === 0 && statusInfo?.yolo?.models && statusInfo.yolo.models.length > 0) iaModels = statusInfo.yolo.models
    if (iaModels.length === 0 && Array.isArray(statusInfo?.services)) {
      const v = statusInfo.services.find(s => s.type === 'vision')
      if (v && Array.isArray(v.models)) iaModels = v.models
    }
  }

  const onAction = async (action) => {
    setRunning(true)
    setLastOutput(null)
    try {
      let r
      switch (action) {
        case 'start': r = await startService(target); break
        case 'stop': r = await stopService(target); break
        case 'restart': r = await restartService(target); break
        case 'logs': r = await logsService(target); break
        default: r = await startService(target)
      }
      if (!r || !r.ok) throw new Error(r?.error || 'Acción fallida')
      setLastOutput((r.data && r.data.output) || (r.data && r.data.message) || 'OK')
      await refresh()
    } catch (e) {
      setLastOutput(String(e))
    } finally {
      setRunning(false)
    }
  }

  const Controls = () => (
    <div className={`flex items-center gap-2 ${compact ? 'text-xs' : 'text-sm'}`}>
      {isRunning ? (
        <button onClick={() => onAction('restart')} disabled={running} className="hover:underline">Reiniciar</button>
      ) : (
        <button onClick={() => onAction('start')} disabled={running} className="hover:underline">Iniciar</button>
      )}
      <button onClick={() => onAction('stop')} disabled={running} className="hover:underline">Detener</button>
      <button onClick={() => onAction('logs')} disabled={running} className="hover:underline">Logs</button>
    </div>
  )

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-3">
        {/* controls left support */}
        {controlsLeft ? (
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <Controls />
          </div>
        ) : null}

        <div className="flex items-center gap-2">
          {/* Docker whale */}
          <svg width={compact ? 16 : 20} height={compact ? 16 : 20} viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" className={`${isRunning ? 'text-[#2496ED]' : 'text-gray-400'} transition-colors duration-200`} fill="currentColor" aria-hidden="true">
            <path d="M22 12c0 2.8-2.2 5-5 5h-1c-1.7 0-3.3.9-4.2 2.3-.3.4-1 .4-1.3 0C9.3 18.9 7.7 18 6 18H5c-2.8 0-5-2.2-5-5 0-1.7 1-3 2.2-3.9C3.8 8.9 6 8 8.8 8c2.4 0 4.5 1 6 3 0 .1.6.1.6.1h.4c2.8 0 5 2.2 5 5z" />
          </svg>

          <div className="text-sm font-medium">
            <div className="flex items-baseline gap-2">
              <span className={`${compact ? 'text-sm' : 'text-base'} font-medium`}>{name}</span>
              <span className={`ml-2 inline-block h-2 w-2 rounded-full ${isRunning ? 'bg-green-500' : 'bg-red-500'}`} />
            </div>
          </div>

          {/* DB small status */}
          {target === 'db' && isRunning && (
            <div className="text-[11px] text-gray-500 mt-1">DB corriendo</div>
          )}

          </div>

        {!controlsLeft && (
          <div className="ml-auto flex items-center gap-2 text-xs text-gray-500">
            <Controls />
            <button onClick={async () => {
              setRunning(true)
              setLastOutput(null)
              try {
                await refresh()
                const proxy = await fetch('/api/ai/status')
                const j = proxy.ok ? await proxy.json() : { error: 'no response' }
                setLastOutput(JSON.stringify({ target, source: 'proxy', ...j }, null, 2))
                setShowDebug(true)
              } catch (e) { setLastOutput(String(e)); setShowDebug(true) }
              setRunning(false)
            }} className="hover:underline">Forzar</button>

          </div>
        )}
      </div>

      {/* Services / details (second line: services running in the docker) */}
      <div>
        <div className="text-[11px] text-gray-700 min-h-[1rem]">
          {target === 'vision' && iaModels && iaModels.length > 0 ? iaModels.join(', ') : (target === 'db' && svc?.services && svc.services.length > 0 ? svc.services.join(', ') : <span className="text-gray-300">—</span>)}
        </div>

        {lastOutput && showDebug && (
          <pre className="mt-2 max-w-2xl overflow-auto bg-gray-50 p-2 rounded text-xs text-gray-800 border border-gray-100 whitespace-pre-wrap">{lastOutput}</pre>
        )}
      </div>
    </div>
  )
}
