import { NextResponse } from 'next/server'
import { exec } from 'child_process'
import { promisify } from 'util'
const execP = promisify(exec)

// This endpoint is intentionally gated behind an env var to avoid accidental use in shared environments.
// Set ENABLE_DOCKER_QUERY=1 in your local env to allow querying the 'ranitas-vision' container via docker exec.
export async function GET() {
  try {
    if (!process.env.ENABLE_DOCKER_QUERY || process.env.ENABLE_DOCKER_QUERY !== '1') {
      return NextResponse.json({ ok: false, error: 'disabled' }, { status: 403 })
    }

    // Attempt to exec 'ollama list --json' inside the running container 'ranitas-vision'
    // Fallback to 'ollama list' if --json not supported
    try {
      const { stdout } = await execP('docker exec ranitas-vision ollama list --json', { timeout: 10 * 1000 })
      // Expect stdout to be JSON array or object
      let parsed = null
      try { parsed = JSON.parse(stdout) } catch (e) { parsed = null }
      // Normalize to names
      let names = []
      if (Array.isArray(parsed)) {
        names = parsed.map(m => (typeof m === 'string' ? m : (m.name || m.id || JSON.stringify(m))))
      } else if (parsed && typeof parsed === 'object') {
        // Some ollama versions return { models: [...] }
        const arr = parsed.models || parsed
        if (Array.isArray(arr)) names = arr.map(m => (typeof m === 'string' ? m : (m.name || m.id || JSON.stringify(m))))
      } else {
        // Try to parse plain text listing
        names = stdout.split('\n').map(l => l.trim()).filter(Boolean).map(l => l.split(' ')[0])
      }
      return NextResponse.json({ ok: true, models: names, raw: stdout })
    } catch (e) {
      // Try fallback: direct docker exec + 'ollama list' (non-json)
      try {
        const { stdout } = await execP('docker exec ranitas-vision ollama list', { timeout: 10000 })
        const names = stdout.split('\n').map(l => l.trim()).filter(Boolean).map(l => l.split(' ')[0])
        return NextResponse.json({ ok: true, models: names, raw: stdout })
      } catch (e2) {
        console.error('Docker query failed', e2)
        return NextResponse.json({ ok: false, error: 'docker_exec_failed', details: String(e2) }, { status: 500 })
      }
    }
  } catch (err) {
    console.error('GET /api/ai/docker/models error', err)
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 })
  }
}
