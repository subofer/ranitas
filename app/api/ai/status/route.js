import { NextResponse } from 'next/server'
import { exec } from 'child_process'
import { promisify } from 'util'
const execP = promisify(exec)

export async function GET() {
  try {
    // Prefer to query the vision service directly
    const VISION_HOST = process.env.VISION_HOST || 'http://localhost:8000'

    let data = null
    let containerInfo = { docker_probe: false, container_running: false }

    // If enabled, try to query the ranitas-vision container directly to obtain authoritative status
    if (process.env.ENABLE_DOCKER_QUERY === '1') {
      containerInfo.docker_probe = true
      try {
        // Use helper to discover the best container candidate (more robust)
        const { discoverContainer } = await import('../../../../lib/dockerDiscover.js')
        const found = await discoverContainer()
        containerInfo.ps_cmd = found.cmd
        containerInfo.ps_raw = found.ps_raw
        if (found.candidate) {
          containerInfo.container_candidate = found.candidate
          containerInfo.container_running = true
        }
        if (found.error) containerInfo.docker_list_error = found.error
      } catch (e) {
        // ignore; fallbacks below will attempt other probes
      }

      try {
        // Use curl with a trailing status code marker so we can separately capture body and HTTP status
        const containerTarget = containerInfo.container_candidate || 'ranitas-vision'
        const cmd = `docker exec ${containerTarget} curl -sS -w "\n__STATUS_CODE__:%{http_code}" http://127.0.0.1:8000/status`
        const { stdout, stderr } = await execP(cmd, { timeout: 7000 })
        containerInfo.command = cmd
        containerInfo.stderr = stderr && stderr.length ? stderr : null
        if (stdout) {
          // Split the appended status code marker (if present)
          const marker = '\n__STATUS_CODE__:'
          const idx = stdout.indexOf(marker)
          let body = stdout
          let httpCode = null
          if (idx !== -1) {
            body = stdout.slice(0, idx)
            httpCode = stdout.slice(idx + marker.length).trim()
            containerInfo.http_status = httpCode
          }
          containerInfo.rawBody = body
          containerInfo.raw = stdout
          containerInfo.container_running = true
          try {
            data = JSON.parse(body)
          } catch (e) {
            // If the body isn't pure JSON, leave data=null and keep raw body for debugging
            data = null
          }
        }
      } catch (e) {
        // no extra binary probing (ollama) — rely on the service `/status` endpoint as the single source of truth
        containerInfo.docker_error = String(e)
      }
    }

    // If container is running, try to extract image name and container name for UI (version info).
    // Prefer discovered candidate to avoid hardcoded container names.
    const containerTargetForInspect = containerInfo.container_candidate || 'ranitas-vision'
    if (containerInfo.container_running) {
      try {
        const img = await execP(`docker inspect --format '{{.Config.Image}}' ${containerTargetForInspect}`, { timeout: 2000 })
        if (img && img.stdout) containerInfo.image = img.stdout.trim()
      } catch (imgErr) { /* ignore */ }

      try {
        const nm = await execP(`docker inspect --format '{{.Name}}' ${containerTargetForInspect}`, { timeout: 2000 })
        if (nm && nm.stdout) containerInfo.name = nm.stdout.trim().replace(/^\//, '')
        else if (!containerInfo.name && containerInfo.container_candidate) containerInfo.name = containerInfo.container_candidate
      } catch (nmErr) {
        if (!containerInfo.name && containerInfo.container_candidate) containerInfo.name = containerInfo.container_candidate
      }

      try {
        // Health status (if available)
        const health = await execP(`docker inspect --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}' ${containerTargetForInspect}`, { timeout: 2000 })
        if (health && health.stdout) containerInfo.health = health.stdout.trim()
      } catch (hErr) { /* ignore */ }
    }

    // Also probe the database container (postgres) for status and health
    try {
      const { discoverContainer } = await import('../../../../lib/dockerDiscover.js')
      const dbFound = await discoverContainer('postgres|postgres:|postgresql|pg')
      const dbInfo = { container_running: false }
      if (dbFound && dbFound.candidate) {
        dbInfo.container_candidate = dbFound.candidate
        dbInfo.ps_cmd = dbFound.cmd
        dbInfo.ps_raw = dbFound.ps_raw
        dbInfo.container_running = true
        try {
          const img = await execP(`docker inspect --format '{{.Config.Image}}' ${dbFound.candidate}`, { timeout: 2000 })
          if (img && img.stdout) dbInfo.image = img.stdout.trim()
        } catch (e) {}
        try {
          const nm = await execP(`docker inspect --format '{{.Name}}' ${dbFound.candidate}`, { timeout: 2000 })
          if (nm && nm.stdout) dbInfo.name = nm.stdout.trim().replace(/^\//, '')
        } catch (e) {}
        try {
          const health = await execP(`docker inspect --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}' ${dbFound.candidate}`, { timeout: 2000 })
          if (health && health.stdout) dbInfo.health = health.stdout.trim()
        } catch (e) {}
      }
      containerInfo.db = dbInfo
    } catch (e) {
      // ignore
    }

    // Minimal mapping: use the raw vision-ai payload directly (we control the service), but expose a small mapper
    const { mapStatusData } = await import('../../../../lib/statusMapper.js')
    const { loadedModels, status } = mapStatusData(data, containerInfo)

    return NextResponse.json({ ok: true, loadedModels, count: loadedModels.length, status })
  } catch (error) {
    console.error('❌ Error obteniendo estado de vision:', error)
    // Return partial information so the UI can still render and show container debug info
    return NextResponse.json({ ok: false, error: error.message, loadedModels: [], count: 0, status: { container: containerInfo } }, { status: 500 })
  }
}
