"use client"
import React, { useState, useEffect } from 'react'
import logger from '@/lib/logger'

export default function LogsModal({ open, onClose, defaultContainer = 'vision' }) {
  const [container, setContainer] = useState(defaultContainer)
  const [tail, setTail] = useState(200)
  const [statusLogs, setStatusLogs] = useState(null)
  const [dockerLogs, setDockerLogs] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!open) return
    fetchLogs()
  }, [open, container, tail])

  async function fetchLogs() {
    setLoading(true)
    setError(null)
    try {
      // Fetch service buffered logs via /api/ai/status/logs
      const r1 = await fetch(`/api/ai/status/logs?container=${container}&n=200&tail=${tail}`)
      const s1 = await r1.json().catch(() => null)
      if (s1 && s1.ok) setStatusLogs(s1.logs || s1)
      else setStatusLogs(s1)

      // Fetch docker logs via /api/system/logs
      const r2 = await fetch(`/api/system/logs?container=${container}&tail=${tail}`)
      const s2 = await r2.json().catch(() => null)
      if (s2 && s2.ok) setDockerLogs(s2.logs || s2.docker_logs || s2)
      else setDockerLogs(s2)

      logger.debug({ fetched: true, container }, '[LogsModal]')
    } catch (e) {
      logger.error(`Error fetching logs: ${e}`, '[LogsModal]')
      setError(String(e))
    } finally {
      setLoading(false)
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-6 bg-black/40">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-4xl h-[75vh] overflow-hidden flex flex-col">
        <div className="p-4 border-b flex items-center gap-4">
          <h3 className="font-bold">Logs ({container})</h3>
          <div className="ml-auto flex items-center gap-2">
            <select value={container} onChange={(e)=>setContainer(e.target.value)} className="border rounded px-2 py-1">
              <option value="vision">vision</option>
              <option value="postgres">postgres</option>
            </select>
            <input type="number" value={tail} onChange={(e)=>setTail(Number(e.target.value||200))} className="w-20 border rounded px-2 py-1" />
            <button className="px-3 py-1 bg-blue-600 text-white rounded" onClick={fetchLogs}>Refrescar</button>
            <button className="px-3 py-1 bg-gray-200 rounded" onClick={onClose}>Cerrar</button>
          </div>
        </div>

        <div className="flex-1 overflow-auto p-4 text-xs font-mono">
          {loading && <div>Obteniendo logs...</div>}
          {error && <div className="text-red-600">{error}</div>}

          <div className="mb-4">
            <div className="text-sm font-semibold mb-2">Service logs (buffer)</div>
            <pre className="bg-gray-50 p-2 rounded max-h-60 overflow-auto">{statusLogs ? (Array.isArray(statusLogs) ? statusLogs.map(l => JSON.stringify(l)).join('\n') : JSON.stringify(statusLogs, null, 2)) : 'Sin datos'}</pre>
          </div>

          <div>
            <div className="text-sm font-semibold mb-2">Docker logs (tail)</div>
            <pre className="bg-gray-50 p-2 rounded max-h-60 overflow-auto">{dockerLogs ? (Array.isArray(dockerLogs) ? dockerLogs.join('\n') : JSON.stringify(dockerLogs, null, 2)) : 'Sin datos'}</pre>
          </div>
        </div>
      </div>
    </div>
  )
}