import { NextResponse } from 'next/server'
import { exec } from 'child_process'
import { promisify } from 'util'
const execP = promisify(exec)

const SAFE_ACTIONS = new Set(['start', 'stop', 'restart', 'logs'])

export async function GET() {
  try {
    const VISION_HOST = process.env.VISION_HOST || 'http://localhost:8000'
    const res = await fetch(`${VISION_HOST}/status`).catch(() => null)
    if (!res) return NextResponse.json({ ok: false, error: 'Vision no responde' }, { status: 503 })
    const data = await res.json()
    return NextResponse.json({ ok: true, status: data })
  } catch (err) {
    console.error('Error GET /api/ai/vision-control', err)
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 })
  }
}

export async function POST(req) {
  try {
    const body = await req.json()
    const action = body.action
    const target = body.target || 'vision' // 'vision' or 'db'
    if (!SAFE_ACTIONS.has(action)) return NextResponse.json({ ok: false, error: 'Acción no permitida' }, { status: 400 })

    // Map logical targets to docker compose service names. Keep mapping central here.
    const service = (target === 'db' || target === process.env.DOCKER_DB) ? 'postgres' : 'vision'

    // Commands executed relative to project root where docker-compose.yml lives
    let cmd
    switch (action) {
      case 'start':
        cmd = `docker compose up -d ${service}`
        break
      case 'stop':
        cmd = `docker compose stop ${service}`
        break
      case 'restart':
        cmd = `docker compose restart ${service}`
        break
      case 'logs':
        cmd = `docker compose logs --no-color --tail=500 ${service}`
        break
      default:
        return NextResponse.json({ ok: false, error: 'Acción desconocida' }, { status: 400 })
    }

    const { stdout, stderr } = await execP(cmd, { timeout: 2 * 60 * 1000 })
    const output = (stdout || '') + (stderr ? '\n' + stderr : '')

    // Record audit (fire-and-forget)
    try {
      const { auditAction } = await import('@/lib/actions/audit')
      auditAction({ level: 'INFO', category: 'IA', action: 'CONTROL_VISION', message: `Executed ${action}`, metadata: { cmd, output: output ? (output.length ? output.slice(0, 2000) : output) : null } }).catch(()=>{})
    } catch (auditErr) {
      console.warn('Could not create audit log for vision-control:', auditErr)
    }

    return NextResponse.json({ ok: true, output })
  } catch (err) {
    console.error('Error POST /api/ai/vision-control', err)
    // Audit error
    try {
      const { auditAction } = await import('@/lib/actions/audit')
      auditAction({ level: 'ERROR', category: 'IA', action: 'CONTROL_VISION', message: `Action ${action} failed`, metadata: { error: String(err) } }).catch(()=>{})
    } catch (auditErr) {
      console.warn('Could not create audit log for failed vision-control:', auditErr)
    }
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 })
  }
}
