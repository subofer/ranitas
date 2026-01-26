"use client"
import React, { useState } from 'react'

export default function DnsSync({ className = '' }) {
  const [loadingCheck, setLoadingCheck] = useState(false)
  const [loadingSync, setLoadingSync] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)

  const check = async () => {
    setError(null)
    setLoadingCheck(true)
    try {
      const res = await fetch('/api/dns/check')
      const data = await res.json()
      setResult({ type: 'check', data })
    } catch (e) {
      setError(e.message)
    } finally {
      setLoadingCheck(false)
    }
  }

  const sync = async () => {
    setError(null)
    setLoadingSync(true)
    try {
      const res = await fetch('/api/dns/update', { method: 'POST' })
      const data = await res.json()
      setResult({ type: 'sync', data })
    } catch (e) {
      setError(e.message)
    } finally {
      setLoadingSync(false)
    }
  }

  return (
    <div className={`bg-white border border-gray-200 rounded-lg shadow px-3 py-2 w-72 ${className}`}>
      <div className="flex items-center justify-between mb-2">
        <div className="text-sm font-medium">DNS</div>
        <div className="text-xs text-gray-500">Freedns</div>
      </div>
      <div className="flex gap-2 mb-2">
        <button onClick={check} disabled={loadingCheck || loadingSync} className="flex-1 px-2 py-1 bg-blue-50 text-blue-700 rounded text-sm hover:bg-blue-100">{loadingCheck ? '⏳' : 'Comprobar'}</button>
        <button onClick={sync} disabled={loadingSync || loadingCheck} className="px-2 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700">{loadingSync ? '⏳' : 'Sincronizar'}</button>
      </div>
      <div className="text-xs text-gray-600">
        {error && <div className="text-red-600">Error: {error}</div>}
        {result && result.type === 'check' && (
          <div>
            {result.data.message && <div className="text-xs text-yellow-600 mb-1">{result.data.message}</div>}
            <div>Host: <span className="font-medium">{result.data.host}</span></div>
            <div>Public IP: <span className="font-medium">{result.data.publicIp || 'Desconocida'}</span></div>
            <div>DNS A: <span className="font-medium">{(result.data.dnsA || []).length ? (result.data.dnsA || []).join(', ') : '—'}</span></div>
            <div className={`mt-1 font-medium ${result.data.synced ? 'text-green-600' : 'text-yellow-600'}`}>
              {result.data.synced ? '✅ Sincronizado' : '⚠️ No sincronizado'}
            </div>
          </div>
        )}
        {result && result.type === 'sync' && (
          <div>
            {result.data.ok ? (
              <div className="text-xs text-gray-700">
                <div className="font-medium text-green-600">Respuesta de update:</div>
                <pre className="text-xs text-gray-600 break-words mt-1">{String(result.data.response)}</pre>
              </div>
            ) : (
              <div className="text-red-600">Error: {result.data.error || result.data.message}</div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}