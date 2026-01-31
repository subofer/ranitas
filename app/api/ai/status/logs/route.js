import { NextResponse } from 'next/server'

export async function GET(request) {
  try {
    const url = new URL(request.url)
    const n = url.searchParams.get('n') || '200'
    const container = url.searchParams.get('container') || ''
    const tail = url.searchParams.get('tail') || '200'

    const VISION_HOST = process.env.VISION_HOST || 'http://localhost:8000'
    const qs = new URLSearchParams({ n, container, tail }).toString()
    const endpoint = `${VISION_HOST}/status/logs?${qs}`

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 4000)
    try {
      const resp = await fetch(endpoint, { signal: controller.signal })
      clearTimeout(timeout)
      const data = await resp.json().catch(() => null)
      if (!resp.ok) return NextResponse.json({ ok: false, status: resp.status, error: data || 'fetch failed' }, { status: 502 })
      return NextResponse.json(data)
    } catch (e) {
      return NextResponse.json({ ok: false, error: String(e) }, { status: 500 })
    }
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 })
  }
}