import { NextResponse } from 'next/server'
import fetch from 'node-fetch'
import { execSync } from 'child_process'

const LOCAL = 'http://localhost:11434'

export async function GET() {
  // Try HTTP endpoints first
  const urls = [`${LOCAL}/api/models`, `${LOCAL}/models`, `${LOCAL}/v1/models`]
  const extractNames = (raw) => {
    if (!raw) return []
    if (Array.isArray(raw)) return raw.map(m => (typeof m === 'string' ? m : m.name || m.id || m.model || JSON.stringify(m)))
    if (typeof raw === 'object') {
      if (Array.isArray(raw.models)) return extractNames(raw.models)
      if (raw.models && typeof raw.models === 'object') return Object.keys(raw.models)
      return Object.keys(raw)
    }
    return [String(raw)]
  }

  for (const url of urls) {
    try {
      const res = await fetch(url, { timeout: 2000 })
      if (res.ok) {
        const data = await res.json()
        // Normalize to an array of model names
        const names = extractNames(data)
        return NextResponse.json({ ok: true, models: names })
      }
    } catch (e) {
      // ignore and try next
    }
  }

  // Fallback to CLI (ollama list)
  try {
    // try JSON output first
    const out = execSync('ollama list --json', { encoding: 'utf8' })
    const parsed = JSON.parse(out)
    const names = extractNames(parsed.models || parsed)
    return NextResponse.json({ ok: true, models: names })
  } catch (e) {
    try {
      const out = execSync('ollama list', { encoding: 'utf8' })
      const lines = out.split('\n').map((l) => l.trim()).filter(Boolean)
      const names = lines.map(l => l.split(/\s+/)[0]).filter(n => n && n !== 'NAME')
      return NextResponse.json({ ok: true, models: names })
    } catch (err) {
      return NextResponse.json({ ok: false, error: 'No se pudo obtener la lista de modelos. Asegure que Ollama esté instalado y corriendo localmente.' }, { status: 500 })
    }
  }
}
