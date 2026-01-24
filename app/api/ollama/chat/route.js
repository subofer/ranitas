import { NextResponse } from 'next/server'
import fetch from 'node-fetch'
import { execSync } from 'child_process'

const LOCAL = 'http://localhost:11434'

async function tryHttpGenerate(model, prompt) {
  const urls = [`${LOCAL}/api/generate`, `${LOCAL}/generate`, `${LOCAL}/api/completions`, `${LOCAL}/completions`]
  for (const url of urls) {
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model, prompt })
      })
      if (res.ok) {
        const data = await res.json()
        // try common fields
        if (data?.output || data?.text) return data.output || data.text
        if (data?.choices && data.choices[0]) return data.choices[0].text || data.choices[0].message?.content
        return JSON.stringify(data)
      }
    } catch (e) {
      // ignore and try next
    }
  }
  return null
}

export async function POST(req) {
  try {
    const { model, prompt } = await req.json()

    // Try HTTP API first
    const httpResp = await tryHttpGenerate(model, prompt)
    if (httpResp) return NextResponse.json({ ok: true, text: String(httpResp) })

    // Fallback to CLI
    try {
      // Use ollama run <model> --prompt '<prompt>' --json
      const safePrompt = JSON.stringify(prompt)
      const cmd = `ollama run ${model} --prompt ${safePrompt} --quiet --json`
      const out = execSync(cmd, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] })
      // Try to parse JSON
      try {
        const parsed = JSON.parse(out)
        // parsed may have generations
        const text = parsed?.output || parsed?.text || parsed?.generations?.[0]?.text || JSON.stringify(parsed)
        return NextResponse.json({ ok: true, text })
      } catch (e) {
        return NextResponse.json({ ok: true, text: String(out) })
      }
    } catch (e) {
      return NextResponse.json({ ok: false, error: 'No se pudo ejecutar Ollama localmente. Asegure que Ollama esté corriendo y que el modelo exista.' }, { status: 500 })
    }
  } catch (err) {
    return NextResponse.json({ ok: false, error: 'Petición inválida' }, { status: 400 })
  }
}
