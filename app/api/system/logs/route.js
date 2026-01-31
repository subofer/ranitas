import { NextResponse } from 'next/server'
import child_process from 'child_process'

export async function GET(request) {
  try {
    const url = new URL(request.url)
    const container = url.searchParams.get('container') || null
    const tail = parseInt(url.searchParams.get('tail') || '200', 10)

    if (!container) return NextResponse.json({ ok: false, error: 'missing container param' }, { status: 400 })

    const containerName = container === 'vision' ? 'ranitas-vision' : (container === 'postgres' ? 'ranitas-postgres' : container)

    // Run docker logs with timeout (sync wrapper)
    const cmd = `docker logs --tail ${tail} ${containerName}`

    return await new Promise((resolve) => {
      child_process.exec(cmd, { timeout: 4000, maxBuffer: 1024 * 1024 }, (err, stdout, stderr) => {
        if (err) {
          return resolve(NextResponse.json({ ok: false, error: err.message, stderr: stderr ? String(stderr).slice(0, 1000) : null }))
        }
        const lines = String(stdout || '').split('\n').filter(Boolean)
        resolve(NextResponse.json({ ok: true, container: containerName, tail: tail, logs: lines }))
      })
    })
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 })
  }
}