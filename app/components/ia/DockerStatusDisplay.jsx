"use client"
import { useState } from 'react'
import { useVisionStatusContext } from '@/context/VisionStatusContext'

export default function DockerStatusDisplay({ target = 'vision', compact = false, controlsLeft = false }) {
  const { refresh, getServiceInfo, startService, stopService, restartService, logsService, statusInfo, loadedModels, dockerServices } = useVisionStatusContext()
  const [running, setRunning] = useState(false)
  const [lastOutput, setLastOutput] = useState(null)
  const [showDebug, setShowDebug] = useState(false)
  const [expanded, setExpanded] = useState(true)

  const svc = getServiceInfo && getServiceInfo(target) ? getServiceInfo(target) : {}
  const isRunning = Boolean(svc?.container_running)
  const name = isRunning ? (svc?.name || svc?.container_candidate || (target === 'vision' ? 'servidor llm' : target)) : (target === 'vision' ? 'servidor llm' : 'base de datos')

  // Icon color:
  // - grey = offline
  // - orange = starting
  // - blue = running healthy
  // - red = docker reports 'unhealthy' (explicit Docker health status)
  // - yellow = docker reports 'restarting' (container is being restarted)
  let iconClass = 'text-gray-400'
  if (isRunning) {
    const health = svc?.health ? String(svc.health) : ''
    const psRaw = svc?.ps_raw ? String(svc.ps_raw) : ''
    const containerName = svc?.name || svc?.container_candidate || ''

    // Detectar 'restarting' sólo cuando la línea correspondiente al contenedor actual indica reinicio
    let psIsRestarting = false
    if (psRaw && containerName) {
      psIsRestarting = psRaw
        .split('\n')
        .some(line => line && line.includes(containerName) && /restarting|restart|reiniciando/i.test(line))
    } else {
      // Fallback: si no hay nombre, caer a la detección global
      psIsRestarting = /restarting|restart|reiniciando/i.test(psRaw)
    }

    if (psIsRestarting || /restarting|restart|reiniciando/i.test(health)) {
      // 'Reiniciando' -> color celeste tenue, más grisáceo que el azul de 'running'
      iconClass = 'text-[#86AFCB]'
    } else if (/unhealthy/i.test(health)) {
      // Si no hay indicio de 'restarting' en la línea del contenedor, mantenemos 'unhealthy' como rojo
      iconClass = 'text-red-500'
    } else if (/starting|start/i.test(health)) {
      iconClass = 'text-orange-500'
    } else {
      iconClass = 'text-[#2496ED]'
    }
  }


// Derive services/models and formatted display pieces (GPU, VRAM used/total, and Models list)
  let serviceItems = []
  let modelsList = []
  let gpuName = null
  let totalVram = null
  let usedVram = null
  let geometryService = null
  let llmService = null

  if (target === 'vision') {
    // Models: prefer the vision service top-level `models` (appears as models load), then the global loadedModels list,
    // then statusInfo.loadedModels, and finally fall back to services models when necessary.
    if (Array.isArray(statusInfo?.models) && statusInfo.models.length > 0) {
      modelsList = statusInfo.models.map(m => (typeof m === 'string' ? m : (m.name || String(m))))
    } else if (Array.isArray(loadedModels) && loadedModels.length > 0) {
      modelsList = loadedModels.map(m => (typeof m === 'string' ? m : (m.name || String(m))))
    } else if (Array.isArray(statusInfo?.loadedModels) && statusInfo.loadedModels.length > 0) {
      modelsList = statusInfo.loadedModels.map(m => (typeof m === 'string' ? m : (m.name || String(m))))
    } else if (Array.isArray(svc?.services)) {
      for (const s of svc.services) {
        if (Array.isArray(s.models) && s.models.length > 0) modelsList.push(...s.models)
        else if (s.name) modelsList.push(s.name)
      }
    }

    // GPU and VRAM
    gpuName = statusInfo?.gpu || statusInfo?.cuda?.gpu || null
    totalVram = (typeof statusInfo?.vram_gb === 'number' && statusInfo.vram_gb) || statusInfo?.vram || null
    usedVram = statusInfo?.vram_used || null
    
    // Format VRAM with 1 decimal place always
    if (totalVram !== null) {
      totalVram = Math.round(totalVram * 10) / 10
    }
    if (usedVram !== null) {
      usedVram = Math.round(usedVram * 10) / 10
    }

    // Build serviceItems in the requested order: GPU, VRAM, then Models label + models
    if (gpuName) serviceItems.push(gpuName)
    if (totalVram) {
      const usedVal = usedVram != null ? usedVram : '?'
      serviceItems.push(`${usedVal}/${totalVram}GB`)
    }
    if (modelsList && modelsList.length > 0) serviceItems.push(`Modelos: ${modelsList.join(', ')}`)
    // Always add geometry status
    geometryService = statusInfo?.services?.find(s => s.name === 'geometry')
    if (geometryService) serviceItems.push(`Geometria: ${geometryService.ready ? 'ready' : 'loading'}`)
    
    // Add LLM status with loading indication
    llmService = statusInfo?.services?.find(s => s.name === 'ollama')
    if (llmService) {
      const llmStatus = llmService.ready ? 'ready' : 'cargando...'
      const llmText = `LLM: ${llmService.models?.length ? llmService.models.join(', ') : llmStatus}`
      serviceItems.push(llmText)
    }
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

  const vramInfo = target === 'vision' && totalVram ? `(${usedVram !== null ? usedVram.toFixed(1) : '?'}/${totalVram.toFixed(1)}GB)` : ''

  // Fixed width based on a reasonable max length
  const longestNameLen = 25
  const totalWidth = 20 + longestNameLen * 8 + 8 + 60
  const containerStyle = { width: `${totalWidth}px` }

  if (target === 'vision') {
    // Models: prefer the vision service top-level `models` (appears as models load), then the global loadedModels list,
    // then statusInfo.loadedModels, and finally fall back to services models when necessary.
    if (Array.isArray(statusInfo?.models) && statusInfo.models.length > 0) {
      modelsList = statusInfo.models.map(m => (typeof m === 'string' ? m : (m.name || String(m))))
    } else if (Array.isArray(loadedModels) && loadedModels.length > 0) {
      modelsList = loadedModels.map(m => (typeof m === 'string' ? m : (m.name || String(m))))
    } else if (Array.isArray(statusInfo?.loadedModels) && statusInfo.loadedModels.length > 0) {
      modelsList = statusInfo.loadedModels.map(m => (typeof m === 'string' ? m : (m.name || String(m))))
    } else if (Array.isArray(svc?.services)) {
      for (const s of svc.services) {
        if (Array.isArray(s.models) && s.models.length > 0) modelsList.push(...s.models)
        else if (s.name) modelsList.push(s.name)
      }
    }

    // GPU and VRAM
    gpuName = statusInfo?.gpu || statusInfo?.cuda?.gpu || null
    totalVram = (typeof statusInfo?.vram_gb === 'number' && statusInfo.vram_gb) || statusInfo?.vram || null
    usedVram = statusInfo?.vram_used || null
    
    // Format VRAM with 1 decimal place always
    if (totalVram !== null) {
      totalVram = Math.round(totalVram * 10) / 10
    }
    if (usedVram !== null) {
      usedVram = Math.round(usedVram * 10) / 10
    }

    // Build serviceItems in the requested order: GPU, VRAM, then Models label + models
    if (gpuName) serviceItems.push(gpuName)
    if (totalVram) {
      const usedVal = usedVram != null ? usedVram : '?'
      serviceItems.push(`${usedVal}/${totalVram}GB`)
    }
    if (modelsList && modelsList.length > 0) serviceItems.push(`Modelos: ${modelsList.join(', ')}`)
    // Always add geometry status
    geometryService = statusInfo?.services?.find(s => s.name === 'geometry')
    if (geometryService) serviceItems.push(`Geometria: ${geometryService.ready ? 'ready' : 'loading'}`)
    
    // Add LLM status with loading indication
    llmService = statusInfo?.services?.find(s => s.name === 'ollama')
    if (llmService) {
      const llmStatus = llmService.ready ? 'ready' : 'cargando...'
      const llmText = `LLM: ${llmService.models?.length ? llmService.models.join(', ') : llmStatus}`
      serviceItems.push(llmText)
    }
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

  // Function to clean command output by removing docker paths
  const cleanCommandOutput = (output) => {
    if (!output) return output
    // Remove docker exec prefixes and keep only the actual command
    return output
      .split('\n')
      .map(line => {
        // Remove docker exec ... patterns
        const dockerExecMatch = line.match(/docker exec [^\s]+ (.+)/)
        if (dockerExecMatch) return dockerExecMatch[1]
        // Remove full paths from commands, keep only basename
        const pathMatch = line.match(/\/[^\s]*\/([^\s]+)/)
        if (pathMatch) return line.replace(/\/[^\s]*\//, '')
        return line
      })
      .join('\n')
  }

  return (
    <div className={`flex flex-col gap-0 ${compact ? 'text-xs' : 'text-sm'} ${target === 'vision' ? 'h-[2.5rem]' : 'h-[2rem]'} transition-all duration-300 ease-in-out`}>
      <div className="flex items-center justify-start gap-0.5" style={containerStyle}>
        <div className="flex items-center gap-1">
          {/* Docker icon */}
            <div className="flex-shrink-0 flex items-center justify-center w-[20px] h-[20px]">
              <div 
                className={`${iconClass} transition-colors duration-300`}
                style={{
                  width: '100%',
                  height: '100%',
                  backgroundColor: 'currentColor',
                  maskImage: 'url("https://cdn.simpleicons.org/docker")',
                  WebkitMaskImage: 'url("https://cdn.simpleicons.org/docker")',
                  maskRepeat: 'no-repeat',
                  WebkitMaskRepeat: 'no-repeat',
                  maskPosition: 'center',
                  WebkitMaskPosition: 'center',
                  maskSize: 'contain',
                  WebkitMaskSize: 'contain'
                }}
              />
            </div>

          {/* Container name */}
          <span className={`${compact ? 'text-sm' : 'text-base'} font-medium whitespace-nowrap`}>
            {name} <span className="text-gray-500 text-[10px] ml-1">{vramInfo}</span>
          </span>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-0 text-[9px] text-gray-500 ml-auto">
          {isRunning ? (
            <button onClick={() => onAction('restart')} disabled={running} className="text-[9px] leading-none opacity-80 hover:opacity-100">[rtart]</button>
          ) : (
            <button onClick={() => onAction('start')} disabled={running} className="text-[9px] leading-none opacity-80 hover:opacity-100">[start]</button>
          )}
          <button onClick={() => onAction('stop')} disabled={running} className="text-[9px] leading-none opacity-80 hover:opacity-100">[stop]</button>
          <button onClick={() => setExpanded(!expanded)} className="text-[9px] text-gray-500 hover:text-gray-700 ml-3">
            {expanded ? '▼' : '▲'}
          </button>
        </div>
      </div>

      {/* Services/details second line: at the same level as the first line */}
      <div className="-mt-1 mb-0 text-[10px] text-gray-500 pl-6 leading-none">
        <div className={`transition-all duration-300 ease-in-out ${expanded ? 'block' : 'hidden'}`}>
          {target === 'vision' ? (
            (gpuName || totalVram || (modelsList && modelsList.length > 0) || geometryService || llmService) ? (
              <>
                <div className="text-[10px] text-gray-500">
                  <span className="mr-1">├</span>
                  <span className="font-medium">GPU:</span> <span className="ml-1">{gpuName || '—'}</span>
                  <span className="mx-1">•</span>
                  <span className="font-medium">VRAM:</span> <span className="ml-1">{totalVram ? `${usedVram !== null ? usedVram.toFixed(1) : '?'}/${totalVram.toFixed(1)}GB` : '—'}</span>
                </div>
                <div className="text-[10px] text-gray-500">
                  <span className="mr-1">└</span>
                  <span className="font-medium">Tools:</span> <span className="ml-0.5">
                  {(() => {
                    const tools = []
                    if (geometryService) tools.push('OpenCV')
                    if (modelsList && modelsList.length) tools.push(...modelsList)
                    if (llmService) {
                      if (llmService.models?.length) {
                        tools.push(`LLM(${llmService.models.join(',')})`)
                      } else {
                        tools.push(<span key="llm" className={!llmService.ready ? 'text-orange-400' : ''}>LLM</span>)
                      }
                    }
                    
                    // Create elements with commas
                    const elements = []
                    tools.forEach((tool, index) => {
                      elements.push(tool)
                      if (index < tools.length - 1) {
                        elements.push(', ')
                      }
                    })
                    
                    return elements.length ? elements : ['—']
                  })()}
                </span>
              </div>
              </>

            ) : (
              <div className="text-[10px] text-gray-300"><span className="mr-1">└</span>—</div>
            )
          ) : (
            (svc?.image || svc?.health || svc?.pg_isready) ? (
              <div className="text-[10px] text-gray-500">
                <span className="mr-1">└</span>
                <span className="font-medium">Base de datos:</span> <span className="ml-1">
                  {svc?.image ? svc.image.split('/').pop().split(':')[0] : 'PostgreSQL'} 
                  {svc?.health ? ` (${svc.health})` : ''} 
                  {svc?.pg_isready ? ` - ${svc.pg_isready.includes('accepting') ? 'accepting connections' : svc.pg_isready}` : ''}
                </span>
              </div>
            ) : (
              <div className="text-[10px] text-gray-300"><span className="mr-1">└</span> </div>
            )
          )}

          {lastOutput && showDebug && (
            <pre className="mt-2 max-w-2xl overflow-auto bg-gray-50 p-2 rounded text-xs text-gray-800 border border-gray-100 whitespace-pre-wrap">{cleanCommandOutput(lastOutput)}</pre>
          )}
        </div>
      </div>
    </div>
  )
}
