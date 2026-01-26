import { NextResponse } from 'next/server'
import sharp from 'sharp'
import { Ollama } from 'ollama'

const OLLAMA_HOST = 'http://localhost:11434'
const ollama = new Ollama({ host: OLLAMA_HOST })

export const dynamic = 'force-dynamic'
export const runtime = 'edge'

async function prepareImageForModel(buffer, maxSize = 896) {
  const img = sharp(buffer).rotate()
  const meta = await img.metadata()
  let { width = 0, height = 0 } = meta

  // Downscale if needed
  if (Math.max(width, height) > maxSize) {
    const scale = maxSize / Math.max(width, height)
    width = Math.round(width * scale)
    height = Math.round(height * scale)
    const resized = await img.resize({ width, height, fit: 'inside', kernel: 'lanczos3' }).toBuffer()
    return { buffer: resized, width, height }
  }

  const buf = await img.jpeg({ quality: 90 }).toBuffer()
  return { buffer: buf, width, height }
}

const PROMPT = `Eres un sistema de visión experto. Dada la imagen, detecta las 4 esquinas del documento presente y responde EXCLUSIVAMENTE con JSON en el siguiente formato:
{"points":[{"x":0.0,"y":0.0}, {"x":1.0,"y":0.0}, {"x":1.0,"y":1.0}, {"x":0.0,"y":1.0}]}

- Las coordenadas deben ser normalizadas en el rango [0,1], relativas al ancho/alto de la imagen enviada.
- Deben estar en orden Top-Left, Top-Right, Bottom-Right, Bottom-Left.
- Devuelve solo JSON y nada más.`

export async function POST(req) {
  try {
    const form = await req.formData()
    const image = form.get('image')
    const model = form.get('model') || 'qwen2.5-vl'

    if (!image) return NextResponse.json({ ok: false, error: 'No image provided' }, { status: 400 })

    const bytes = await image.arrayBuffer()
    const buffer = Buffer.from(bytes)

    // Get original dimensions
    const meta = await sharp(buffer).metadata()
    const origW = meta.width || 0
    const origH = meta.height || 0

    // Prepare image for model (simple resize)
    const { buffer: optimizedBuffer, width: optW, height: optH } = await prepareImageForModel(buffer)
    const optimizedBase64 = optimizedBuffer.toString('base64')

    // Call Ollama
    let resp
    try {
      resp = await ollama.generate({
        model: model,
        prompt: PROMPT,
        images: [optimizedBase64],
        stream: false,
        format: 'text',
        options: { temperature: 0 }
      })
    } catch (err) {
      console.error('Ollama error:', err.message || err)
      return NextResponse.json({ ok: false, error: 'LLM error', details: String(err) }, { status: 500 })
    }

    const text = resp?.response || ''
    // Extract JSON from response
    const match = text.match(/\{[\s\S]*\}/)
    if (!match) return NextResponse.json({ ok: false, error: 'No JSON in LLM response', raw: text }, { status: 502 })

    let parsed
    try {
      parsed = JSON.parse(match[0])
    } catch (e) {
      return NextResponse.json({ ok: false, error: 'Invalid JSON from LLM', raw: match[0] }, { status: 502 })
    }

    if (!Array.isArray(parsed.points) || parsed.points.length !== 4) {
      return NextResponse.json({ ok: false, error: 'LLM did not return 4 points', parsed }, { status: 422 })
    }

    // Validate and compute absolute coordinates relative to original image
    const pointsNorm = parsed.points.map(p => ({ x: Number(p.x), y: Number(p.y) }))
    for (const p of pointsNorm) {
      if (Number.isNaN(p.x) || Number.isNaN(p.y) || p.x < 0 || p.x > 1 || p.y < 0 || p.y > 1) {
        return NextResponse.json({ ok: false, error: 'Invalid point values', parsed }, { status: 422 })
      }
    }

    const absPoints = pointsNorm.map(p => ({ x: Math.round(p.x * origW), y: Math.round(p.y * origH) }))

    // Create debug image overlay (SVG) on optimized image
    const svgCircles = pointsNorm.map((p, i) => {
      const cx = Math.round(p.x * optW)
      const cy = Math.round(p.y * optH)
      return `<circle cx="${cx}" cy="${cy}" r="8" fill="rgba(0,255,0,0.6)" stroke="white" stroke-width="2" /><text x="${cx+10}" y="${cy+6}" font-size="18" fill="white">${i+1}</text>`
    }).join('\n')
    const svgLines = `<polyline points="${pointsNorm.map(p => `${Math.round(p.x*optW)},${Math.round(p.y*optH)}`).join(' ')}" fill="none" stroke="lime" stroke-width="4" stroke-opacity="0.8" />`
    const svg = `<svg width="${optW}" height="${optH}" xmlns="http://www.w3.org/2000/svg">${svgLines}${svgCircles}</svg>`

    const debugBuf = await sharp(optimizedBuffer)
      .composite([{ input: Buffer.from(svg), top: 0, left: 0 }])
      .png()
      .toBuffer()

    const debugBase64 = debugBuf.toString('base64')

    return NextResponse.json({ ok: true, points: absPoints, normalized: pointsNorm, debug: debugBase64, optimized: { width: optW, height: optH }, original: { width: origW, height: origH } })

  } catch (err) {
    console.error('Detect corners error:', err)
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 })
  }
}
