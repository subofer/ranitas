import { NextResponse } from 'next/server'

const VISION_HOST = process.env.VISION_HOST || 'http://localhost:8000'

export async function GET() {
  try {
    // Forward to vision:/status to get list of available IA components and loaded models
    const res = await fetch(`${VISION_HOST}/status`)
    if (!res.ok) throw new Error(`Vision status HTTP ${res.status}`)

    const data = await res.json()
    // Extract models from status response
    const models = data?.loadedModels || data?.models || []

    return NextResponse.json({ ok: true, models, raw: data })
  } catch (err) {
    console.error('❌ Error obteniendo modelos desde vision:', err.message || err)
    return NextResponse.json({ ok: false, error: 'No se pudo consultar el servicio vision para modelos', details: String(err) }, { status: 500 })
  }
}

export async function POST(req) {
  try {
    const body = await req.json()
    const model = body?.model
    if (!model) return NextResponse.json({ ok: false, error: 'model required' }, { status: 400 })

    // Forward the load request to vision
    const resp = await fetch(`${VISION_HOST}/models/load`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model })
    })

    if (!resp.ok) {
      const txt = await resp.text()
      throw new Error(`Vision load failed: ${resp.status} ${txt}`)
    }

    const data = await resp.json()
    return NextResponse.json({ ok: true, result: data })
  } catch (err) {
    console.error('❌ Error cargando modelo en vision:', err.message || err)
    return NextResponse.json({ ok: false, error: 'No se pudo pedir carga de modelo', details: String(err) }, { status: 500 })
  }
}
