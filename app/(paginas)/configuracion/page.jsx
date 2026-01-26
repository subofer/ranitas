"use client"

import { useEffect, useState } from 'react'
import DnsSync from '@/components/DnsSync'

export default function ConfiguracionPage() {
  const [config, setConfig] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch('/api/config')
        const data = await res.json()
        setConfig(data)
      } catch (e) {
        setError(e.message)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold">Configuración</h1>
          <p className="text-sm text-gray-600 mt-1">Centraliza valores y herramientas de configuración</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="col-span-1 md:col-span-2">
          <div className="bg-white rounded-lg border p-4 shadow-sm">
            <h2 className="text-lg font-semibold mb-2">Valores de Configuración</h2>
            {loading && <div className="text-sm text-gray-500">Cargando...</div>}
            {error && <div className="text-sm text-red-600">Error: {error}</div>}
            {config && (
              <div className="text-xs text-gray-700">
                <div className="mb-2"><strong>DNS Update Host:</strong> {config.dns.host || 'No configurado'}</div>

                <div className="mb-2">
                  <div className="flex items-center gap-2">
                    <strong>DNS Update URL:</strong>
                    {config.dns.masked ? (
                      <span className="text-gray-600 text-xs">(token oculto por seguridad)</span>
                    ) : null}
                  </div>
                  <div className="mt-1 flex items-center gap-2">
                    <code className="break-all bg-gray-50 px-2 py-1 rounded text-xs">{config.dns.url || 'No configurado'}</code>
                    <button
                      className="text-xs px-2 py-1 bg-gray-100 rounded hover:bg-gray-200"
                      onClick={async () => {
                        try {
                          await navigator.clipboard.writeText(config.dns.url || '')
                          alert('URL (enmascarada) copiada al portapapeles')
                        } catch (e) {
                          alert('No se pudo copiar')
                        }
                      }}
                    >Copiar</button>
                  </div>
                </div>

                <div className="mb-2"><strong>NODE_ENV:</strong> {config.env.nodeEnv}</div>
                <div className="mb-2"><strong>IA - Ajustes por defecto:</strong>
                  <pre className="bg-gray-50 p-2 rounded mt-1 text-xs overflow-auto">{JSON.stringify(config.ia.DEFAULT_ADJUSTMENTS, null, 2)}</pre>
                </div>
                <div className="mb-2"><strong>IA - Modos disponibles:</strong>
                  <pre className="bg-gray-50 p-2 rounded mt-1 text-xs overflow-auto">{JSON.stringify(config.ia.MODES, null, 2)}</pre>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="col-span-1">
          <div className="bg-white rounded-lg border p-4 shadow-sm">
            <h2 className="text-lg font-semibold mb-2">Herramientas</h2>
            <p className="text-sm text-gray-600 mb-3">Acciones de mantenimiento y sincronización</p>
            <DnsSync />
          </div>
        </div>
      </div>
    </div>
  )
}