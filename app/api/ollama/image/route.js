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
        if (data?.output || data?.text) return data.output || data.text
        if (data?.choices && data.choices[0]) return data.choices[0].text || data.choices[0].message?.content
        return JSON.stringify(data)
      }
    } catch (e) {
      // ignore
    }
  }
  return null
}

export async function POST(req) {
  try {
    const fd = await req.formData()
    const file = fd.get('image')
    const model = fd.get('model') || 'default'

    if (!file || !file.name) return NextResponse.json({ ok: false, error: 'No se subió imagen' }, { status: 400 })

    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    const b64 = buffer.toString('base64')
    const meta = { name: file.name, size: buffer.length, type: file.type }

    const prompt = [
      'Analiza la imagen adjunta y devuelve una descripción detallada, objetos detectados, colores dominantes y cualquier información útil. Incluyo metadatos:',
      JSON.stringify(meta),
      'Si el modelo soporta entrada binaria, procesa el base64: ' + 'data:' + meta.type + ';base64,' + b64,
      'Si no puede procesar la imagen directamente, usa los metadatos disponibles para inferir información y se honesto sobre limitaciones.'
    ].join('\n\n')

    // try HTTP
    const http = await tryHttpGenerate(model, prompt)
    if (http) return NextResponse.json({ ok: true, text: String(http) })

    // fallback CLI
    try {
      const safePrompt = JSON.stringify(prompt)
      const cmd = `ollama run ${model} --prompt ${safePrompt} --quiet --json`
      const out = execSync(cmd, { encoding: 'utf8' })
      try {
        const parsed = JSON.parse(out)
        const text = parsed?.output || parsed?.text || parsed?.generations?.[0]?.text || JSON.stringify(parsed)
        return NextResponse.json({ ok: true, text })
      } catch (e) {
        return NextResponse.json({ ok: true, text: String(out) })
      }
    } catch (e) {
      return NextResponse.json({ ok: false, error: 'No se pudo ejecutar Ollama localmente para analizar la imagen.' }, { status: 500 })
    }
  } catch (err) {
    return NextResponse.json({ ok: false, error: 'Error procesando la imagen' }, { status: 500 })
  }
}
