"use client"

import { useEffect, useState } from 'react'
import DnsSync from '@/components/DnsSync'

function DnsSettingsBlock({ config, onSaved }) {
  const [editing, setEditing] = useState(false)
  const [host, setHost] = useState(config?.dns?.host || '')
  const [url, setUrl] = useState(config?.dns?.url || '')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setHost(config?.dns?.host || '')
    setUrl(config?.dns?.url || '')
  }, [config])

  const sanitizeHost = (h) => {
    try {
      if (!h) return h
      if (h.startsWith('http://') || h.startsWith('https://')) {
        return new URL(h).hostname
      }
      // strip trailing slashes or paths
      if (h.includes('/')) return h.split('/')[0]
      return h
    } catch (e) {
      return h
    }
  }

  const save = async () => {
    setSaving(true)
    try {
      const hostToSave = sanitizeHost(host)
      await fetch('/api/settings', { method: 'POST', body: JSON.stringify({ key: 'dns.host', value: hostToSave }), headers: { 'Content-Type': 'application/json' } })
      await fetch('/api/settings', { method: 'POST', body: JSON.stringify({ key: 'dns.url', value: url }), headers: { 'Content-Type': 'application/json' } })
      alert('DNS guardado')
      setEditing(false)
      onSaved && onSaved()
    } catch (e) {
      alert('Error guardando DNS')
    } finally { setSaving(false) }
  }

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <div><strong>DNS Update Host:</strong> <span className="ml-2 text-sm text-gray-700">{config?.dns?.host || 'No configurado'}</span></div>
        <div>
          {!editing ? <button onClick={() => setEditing(true)} className="text-xs px-2 py-1 bg-gray-100 rounded">Editar</button> : <button onClick={() => { setEditing(false); setHost(config?.dns?.host || ''); setUrl(config?.dns?.url || '') }} className="text-xs px-2 py-1 bg-gray-100 rounded">Cancelar</button>}
        </div>
      </div>

      {editing ? (
        <div className="mb-3">
          <label className="text-xs">Host</label>
          <input className="block w-full p-2 border rounded mt-1 text-sm" value={host} onChange={(e) => setHost(e.target.value)} />
          {host && (host.startsWith('http://') || host.startsWith('https://')) && (
            <div className="text-xs text-yellow-600 mt-1">Se detectó un esquema (http/https). Se guardará solo el hostname.</div>
          )}
          <label className="text-xs mt-2">URL (completa)</label>
          <input className="block w-full p-2 border rounded mt-1 text-sm" value={url} onChange={(e) => setUrl(e.target.value)} />
          <div className="mt-2 flex gap-2">
            <button disabled={saving} onClick={save} className="px-3 py-1 bg-blue-600 text-white rounded text-sm">{saving ? 'Guardando...' : 'Guardar'}</button>
            <button disabled={saving} onClick={() => setEditing(false)} className="px-3 py-1 bg-gray-100 rounded text-sm">Cancelar</button>
          </div>
        </div>
      ) : (
        <div className="mb-3 flex items-center gap-2">
          <code className="break-all bg-gray-50 px-2 py-1 rounded text-xs">{config.dns.url || 'No configurado'}</code>
          <button className="text-xs px-2 py-1 bg-gray-100 rounded" onClick={async () => { try { await navigator.clipboard.writeText(config.dns.url || ''); alert('URL copiada') } catch (e) { alert('No se pudo copiar') } }}>Copiar</button>
        </div>
      )}
    </div>
  )
}

function IAAdjustmentsEditor({ defaultValue, onSaved }) {
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState(JSON.stringify(defaultValue, null, 2))
  const [saving, setSaving] = useState(false)

  useEffect(() => setValue(JSON.stringify(defaultValue, null, 2)), [defaultValue])

  const save = async () => {
    setSaving(true)
    try {
      const parsed = JSON.parse(value)
      const res = await fetch('/api/settings', { method: 'POST', body: JSON.stringify({ key: 'ia.DEFAULT_ADJUSTMENTS', value: parsed }), headers: { 'Content-Type': 'application/json' } })
      const js = await res.json()
      if (js.ok) {
        alert('Ajustes IA guardados')
        setEditing(false)
        onSaved && onSaved(parsed)
      } else {
        alert('Error guardando')
      }
    } catch (e) {
      alert('JSON inválido')
    } finally { setSaving(false) }
  }

  return (
    <div>
      {!editing ? (
        <div className="mb-2">
          <pre className="bg-gray-50 p-2 rounded text-xs overflow-auto">{value}</pre>
          <div className="mt-2"><button onClick={() => setEditing(true)} className="text-xs px-2 py-1 bg-gray-100 rounded">Editar</button></div>
        </div>
      ) : (
        <div>
          <textarea className="w-full h-40 p-2 border rounded text-xs" value={value} onChange={(e) => setValue(e.target.value)} />
          <div className="mt-2 flex gap-2">
            <button onClick={save} disabled={saving} className="px-3 py-1 bg-blue-600 text-white rounded text-sm">{saving ? 'Guardando...' : 'Guardar'}</button>
            <button onClick={() => setEditing(false)} disabled={saving} className="px-3 py-1 bg-gray-100 rounded text-sm">Cancelar</button>
          </div>
        </div>
      )}
    </div>
  )
}

export default function ConfiguracionPage() {
  const [config, setConfig] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const load = async () => {
      try {
        const [cfgRes, settingsRes] = await Promise.all([
          fetch('/api/config'),
          fetch('/api/settings')
        ])
        const cfg = await cfgRes.json()
        const settingsData = await settingsRes.json()
        // Merge settings overrides into config representation
        const merged = { ...cfg }
        if (settingsData.ok && settingsData.settings) {
          merged.settings = settingsData.settings
          // override dns values if provided
          merged.dns = merged.dns || {}
          if (settingsData.settings['dns.url']) merged.dns.url = settingsData.settings['dns.url']
          if (settingsData.settings['dns.host']) merged.dns.host = settingsData.settings['dns.host']
        }
        setConfig(merged)
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
                <DnsSettingsBlock config={config} onSaved={async () => {
                  setLoading(true)
                  const s = await fetch('/api/settings')
                  const json = await s.json()
                  const merged = { ...config }
                  if (json.ok && json.settings) {
                    merged.settings = json.settings
                    if (json.settings['dns.url']) merged.dns.url = json.settings['dns.url']
                    if (json.settings['dns.host']) merged.dns.host = json.settings['dns.host']
                  }
                  setConfig(merged)
                  setLoading(false)
                }} />

                <div className="mb-2"><strong>NODE_ENV:</strong> {config.env.nodeEnv}</div>
                <div className="mb-2"><strong>IA - Ajustes por defecto:</strong>
                  <IAAdjustmentsEditor defaultValue={config.ia.DEFAULT_ADJUSTMENTS} onSaved={async (newVal) => {
                    // Save setting
                    try {
                      const res = await fetch('/api/settings', { method: 'POST', body: JSON.stringify({ key: 'ia.DEFAULT_ADJUSTMENTS', value: newVal }), headers: { 'Content-Type': 'application/json' } })
                      const js = await res.json()
                      if (js.ok) alert('Ajustes guardados')
                    } catch (e) { alert('Error guardando') }
                  }} />
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