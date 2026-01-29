"use client"
import { useState } from 'react'
import { useVisionStatusContext } from '@/context/VisionStatusContext'

export default function DockerServiceBlock({ target = 'vision', label = 'Service' }) {
  const { loadedModels = [], refresh, getServiceInfo, startService, stopService, restartService, logsService } = useVisionStatusContext()
  const [running, setRunning] = useState(false)
  const [lastOutput, setLastOutput] = useState(null)
  const [showDebug, setShowDebug] = useState(false)

  const svc = getServiceInfo && getServiceInfo(target) ? getServiceInfo(target) : {}
  const name = svc?.name || svc?.container_candidate || (target === 'db' ? process.env.NEXT_PUBLIC_DOCKER_DB || process.env.DOCKER_DB : process.env.NEXT_PUBLIC_DOCKER_IA || process.env.DOCKER_IA) || target
  const image = svc?.image || null
  const health = svc?.health || null
  const isRunning = Boolean(svc?.container_running)

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

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          {/* Docker whale */}
          <svg width="20" height="20" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" className={`${isRunning ? 'text-[#2496ED]' : 'text-gray-400'} transition-colors duration-200`} fill="currentColor" aria-hidden="true">
            <path d="M22 12c0 2.8-2.2 5-5 5h-1c-1.7 0-3.3.9-4.2 2.3-.3.4-1 .4-1.3 0C9.3 18.9 7.7 18 6 18H5c-2.8 0-5-2.2-5-5 0-1.7 1-3 2.2-3.9C3.8 8.9 6 8 8.8 8c2.4 0 4.5 1 6 3 0 .1.6.1.6.1h.4c2.8 0 5 2.2 5 5z" />
          </svg>

          <div className="text-sm font-medium">
            <div className="flex items-baseline gap-2">
              <span>{label}</span>
              <span className="text-xs text-gray-500">{name}</span>
              <span className={`ml-2 inline-block h-2 w-2 rounded-full ${isRunning ? 'bg-green-500' : 'bg-red-500'}`} />
            </div>
            {image && <div className="text-xs text-gray-400">{image} {health && <span className="ml-2">• {health}</span>}</div>}
          </div>
        </div>

        <div className="ml-auto flex items-center gap-2 text-xs text-gray-500">
          {isRunning ? (
            <button onClick={() => onAction('restart')} disabled={running} className="hover:underline">Reiniciar</button>
          ) : (
            <button onClick={() => onAction('start')} disabled={running} className="hover:underline">Iniciar</button>
          )}

          <button onClick={() => onAction('stop')} disabled={running} className="hover:underline">Detener</button>

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
      </div>

      {/* Services / details */}
      <div>
        {target === 'vision' && loadedModels && loadedModels.length > 0 ? (
          <div className="text-xs text-gray-700">Modelos: {loadedModels.map(m => m.name).join(', ')}</div>
        ) : (target === 'db' ? (
          <div className="text-xs text-gray-600">DB container: {name} {health ? `• ${health}` : ''}</div>
        ) : null)}

        {lastOutput && showDebug && (
          <pre className="mt-2 max-w-2xl overflow-auto bg-gray-50 p-2 rounded text-xs text-gray-800 border border-gray-100 whitespace-pre-wrap">{lastOutput}</pre>
        )}
      </div>
    </div>
  )
}
