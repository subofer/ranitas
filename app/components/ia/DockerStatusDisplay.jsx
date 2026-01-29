"use client"
import { useState } from 'react'
import { useVisionStatusContext } from '@/context/VisionStatusContext'

export default function DockerStatusDisplay({ target = 'vision', compact = false, controlsLeft = false }) {
  const { refresh, getServiceInfo, startService, stopService, restartService, logsService, statusInfo, loadedModels } = useVisionStatusContext()
  const [running, setRunning] = useState(false)
  const [lastOutput, setLastOutput] = useState(null)
  const [showDebug, setShowDebug] = useState(false)

  const svc = getServiceInfo && getServiceInfo(target) ? getServiceInfo(target) : {}
  const name = svc?.name || svc?.container_candidate || target
  const isRunning = Boolean(svc?.container_running)

  // Derive services/models to display (and extra info like GPU/VRAM or DB version)
  let serviceItems = []
  if (target === 'vision') {
    if (Array.isArray(loadedModels) && loadedModels.length > 0) serviceItems = loadedModels.map(m => (typeof m === 'string' ? m : (m.name || String(m))))
    if (serviceItems.length === 0 && Array.isArray(statusInfo?.loadedModels) && statusInfo.loadedModels.length > 0) serviceItems = statusInfo.loadedModels.map(m => (typeof m === 'string' ? m : (m.name || String(m))))
    if (serviceItems.length === 0 && Array.isArray(svc?.services)) {
      // flatten models from services
      for (const s of svc.services) {
        if (Array.isArray(s.models) && s.models.length > 0) serviceItems.push(...s.models)
        else if (s.name) serviceItems.push(s.name)
      }
    }

    // Add compact hardware info if available
    const hw = []
    if (statusInfo?.gpu) hw.push(statusInfo.gpu)
    if (typeof statusInfo?.vram_gb === 'number') hw.push(`${statusInfo.vram_gb}GB`)
    if (statusInfo?.vram_used) hw.push(`used ${statusInfo.vram_used}`)
    if (hw.length > 0) serviceItems = [...serviceItems, ...hw]
  } else {
    // DB: prefer explicit DB info (database name, version, pg_isready, image)
    const dbItems = []
    if (svc?.status && typeof svc.status === 'object') {
      if (svc.status.database) dbItems.push(svc.status.database)
      if (svc.status.db_name) dbItems.push(svc.status.db_name)
      if (svc.status.version) dbItems.push(`v${svc.status.version}`)
      if (svc.status.pg_version) dbItems.push(`v${svc.status.pg_version}`)
    }
    if (svc?.pg_isready) dbItems.push(svc.pg_isready)
    if (svc?.image) dbItems.push(String(svc.image).split('/').pop())

    if (Array.isArray(svc?.services) && svc.services.length > 0) serviceItems = svc.services
    else if (dbItems.length > 0) serviceItems = dbItems
    else if (svc?.status && typeof svc.status === 'object') serviceItems = [JSON.stringify(svc.status)]
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

  return (
    <div className={`flex flex-col gap-0.5 ${compact ? 'text-xs' : 'text-sm'}`}>
      <div className="flex items-center gap-3">
        {/* Left controls support */}
        {controlsLeft ? (
          <div className="flex items-center gap-2 text-xs text-gray-500">
            {isRunning ? (
              <button onClick={() => onAction('restart')} disabled={running} className="hover:underline">Reiniciar</button>
            ) : (
              <button onClick={() => onAction('start')} disabled={running} className="hover:underline">Iniciar</button>
            )}
            <button onClick={() => onAction('stop')} disabled={running} className="hover:underline">Detener</button>
            <button onClick={() => onAction('logs')} disabled={running} className="hover:underline">Logs</button>
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

        </div>

        {/* controls on right */}
        {!controlsLeft && (
          <div className="ml-auto flex items-center gap-2 text-xs text-gray-500">
            {isRunning ? (
              <button onClick={() => onAction('restart')} disabled={running} className="hover:underline">Reiniciar</button>
            ) : (
              <button onClick={() => onAction('start')} disabled={running} className="hover:underline">Iniciar</button>
            )}
            <button onClick={() => onAction('stop')} disabled={running} className="hover:underline">Detener</button>
            <button onClick={() => onAction('logs')} disabled={running} className="hover:underline">Logs</button>
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

      {/* Services/details second line: indented right to indicate it is subordinate and more compact */}
      <div className="ml-4 mt-0.5 text-[11px]">
        {serviceItems && serviceItems.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {serviceItems.map((s, i) => (
              <span key={i} className="inline-flex items-center gap-1 bg-gray-50 border border-gray-100 rounded-full px-2 py-0.5 text-[10px] text-gray-700">{s}</span>
            ))}
          </div>
        ) : (
          <div className="text-[11px] text-gray-300">—</div>
        )}

        {lastOutput && showDebug && (
          <pre className="mt-2 max-w-2xl overflow-auto bg-gray-50 p-2 rounded text-xs text-gray-800 border border-gray-100 whitespace-pre-wrap">{lastOutput}</pre>
        )}
      </div>
    </div>
  )
}
