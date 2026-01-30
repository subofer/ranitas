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

    // Attempt to probe Docker on the host and query candidates for authoritative status.
    // This runs by default (no ENV gate) but fails gracefully if Docker isn't available.
    try {
      // Quick check if docker is available
      await execP('docker version --format "{{.Server.Version}}"', { timeout: 2000 })
      containerInfo.docker_probe = true

      const { discoverContainer } = await import('../../../../lib/dockerDiscover.js')

      // Discover vision container candidate
      const foundVision = await discoverContainer('vision|ranitas-vision|ranitas-vision:')
      if (foundVision) {
        containerInfo.ps_cmd = foundVision.cmd
        containerInfo.ps_raw = foundVision.ps_raw
        if (foundVision.candidate) {
          containerInfo.container_candidate = foundVision.candidate
          containerInfo.container_running = true
        }
        if (foundVision.error) containerInfo.docker_list_error = foundVision.error
      }

      // Discover DB candidate
      const foundDb = await discoverContainer('postgres|postgres:|postgresql|pg')
      if (foundDb) {
        containerInfo.db = containerInfo.db || { container_running: false }
        containerInfo.db.container_candidate = foundDb.candidate || null
        containerInfo.db.ps_cmd = foundDb.cmd
        containerInfo.db.ps_raw = foundDb.ps_raw
        if (foundDb.candidate) containerInfo.db.container_running = true
        if (foundDb.error) containerInfo.db.docker_list_error = foundDb.error
      }

      // Helper to try to request /status inside a container (returns parsed JSON or null)
      const tryContainerStatus = async (containerName) => {
        try {
          const cmd = `docker exec ${containerName} curl -sS -w "\n__STATUS_CODE__:%{http_code}" http://127.0.0.1:8000/status`
          const { stdout, stderr } = await execP(cmd, { timeout: 7000 })
          const marker = '\n__STATUS_CODE__:'
          const idx = stdout.indexOf(marker)
          let body = stdout
          let httpCode = null
          if (idx !== -1) {
            body = stdout.slice(0, idx)
            httpCode = stdout.slice(idx + marker.length).trim()
          }
          return { body, raw: stdout, stderr: stderr && stderr.length ? stderr : null, httpCode }
        } catch (e) {
          return null
        }
      }

      // If we have a vision container candidate, try to get its internal /status
      if (containerInfo.container_candidate) {
        const res = await tryContainerStatus(containerInfo.container_candidate)
        if (res) {
          containerInfo.command = `docker exec ${containerInfo.container_candidate} curl ...`
          containerInfo.stderr = res.stderr
          containerInfo.rawBody = res.body
          containerInfo.raw = res.raw
          containerInfo.http_status = res.httpCode
          containerInfo.container_running = true
          try {
            data = JSON.parse(res.body)
            // Normalize: ensure yolo models and services list are present for UI
            try {
              if (data && data.yolo && (!Array.isArray(data.yolo.models) || data.yolo.models.length === 0) && data.yolo.path) {
                const parts = String(data.yolo.path).split('/')
                const base = parts[parts.length - 1]
                const yname = base.replace(/\.[^.]+$/, '')
                data.yolo.models = [yname]
                if (!Array.isArray(data.loadedModels)) data.loadedModels = []
                if (!data.loadedModels.includes(yname)) data.loadedModels.push(yname)
              }
              if (data) {
                // Build services list only for subsystems that are ready/available. Use events to surface a 'since' timestamp when available.
                const services = []
                const events = Array.isArray(data.events) ? data.events : []
                const findSince = (svc) => {
                  const ev = events.slice().reverse().find(e => e.service === svc && /load|ready|models_available|loaded/i.test(String(e.message)))
                  return ev ? ev.ts : null
                }

                if (data.yolo && data.yolo.loaded) {
                  services.push({ name: 'yolo/seg', source: 'ranitas-vision', type: 'vision', models: data.yolo.models || [], ready: true, since: findSince('yolo') })
                }

                if (data.geometry && data.geometry.status) {
                  services.push({ name: 'geometry', source: 'ranitas-vision', type: 'geometry', models: [], ready: data.geometry.status === 'ready', since: findSince('geometry') })
                }

                if (data.ollama && (data.ollama.ready || (Array.isArray(data.ollama.models) && data.ollama.models.length > 0))) {
                  services.push({ name: 'ollama', source: 'ranitas-vision', type: 'llm', models: data.ollama.models || [], ready: Boolean(data.ollama.ready), since: findSince('ollama') })
                }

                data.services = services.length ? services : null

                // Ensure ollama models are reflected in loadedModels too
                if (data.ollama && Array.isArray(data.ollama.models) && data.ollama.models.length > 0) {
                  if (!Array.isArray(data.loadedModels)) data.loadedModels = []
                  for (const m of data.ollama.models) if (m && !data.loadedModels.includes(m)) data.loadedModels.push(m)
                }
              }
            } catch (normErr) { /* ignore normalization errors */ }
          } catch (e) {
            data = null
          }
        }
      }

      // If DB container exposes a status endpoint (optional), try to query it too and attach under db.status
      if (containerInfo.db && containerInfo.db.container_candidate) {
        const dbRes = await tryContainerStatus(containerInfo.db.container_candidate)
        if (dbRes) {
          containerInfo.db.statusRaw = dbRes.body
          try {
            containerInfo.db.status = JSON.parse(dbRes.body)
          } catch (e) {
            containerInfo.db.status = null
          }
        }
      }

    } catch (dockerErr) {
      // Docker not available or an error occurred; keep docker_probe false and continue
      containerInfo.docker_probe = false
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

        // If the DB container doesn't expose an HTTP /status endpoint, try `pg_isready` to get readiness info
        try {
          const pg = await execP(`docker exec ${dbFound.candidate} pg_isready -U postgres`, { timeout: 2000 })
          if (pg && pg.stdout) dbInfo.pg_isready = pg.stdout.trim()
        } catch (e) {}
      }
      containerInfo.db = dbInfo
    } catch (e) {
      // ignore
    }

    // Debug: dump snapshot so we can inspect errors during development
    try {
      const fs = await import('fs')
      try { fs.appendFileSync('/tmp/status.debug.log', JSON.stringify({ ts: new Date().toISOString(), hasData: !!data, dataSample: data && (data.service || data.ok || 'hasData'), containerInfoSnippet: { docker_probe: containerInfo.docker_probe, container_candidate: containerInfo.container_candidate, db: containerInfo.db && { candidate: containerInfo.db.container_candidate, running: containerInfo.db.container_running } } }) + '\n') } catch(e){}
    } catch(e){}

    // Minimal mapping: use the raw vision-ai payload directly (we control the service), but expose a small mapper
    const { mapStatusData } = await import('../../../../lib/statusMapper.js')
    const { loadedModels, status } = mapStatusData(data, containerInfo)

    return NextResponse.json({ ok: true, loadedModels, count: loadedModels.length, status })
  } catch (error) {
    console.error('❌ Error obteniendo estado de vision:', error)
    try { const fs = await import('fs'); fs.appendFileSync('/tmp/status.error.log', `${new Date().toISOString()} ${error && error.stack ? error.stack : String(error)}\n`) } catch(e) { /* ignore logging error */ }
    // Return partial information so the UI can still render and show container debug info
    return NextResponse.json({ ok: false, error: String(error), loadedModels: [], count: 0, status: { container: containerInfo } }, { status: 500 })
  }
}
