import { NextResponse } from 'next/server'
import { spawn } from 'node:child_process'
import fs from 'node:fs'

let yoloProcess = null
let startingPromise = null

const YOLO_SCRIPT = 'scripts/run-yolo.sh'
const YOLO_URL = 'http://127.0.0.1:8000'
const OPENAPI_PATH = YOLO_URL + '/openapi.json'
const START_TIMEOUT = 20000 // ms

async function isServiceAlive() {
  try {
    const resp = await fetch(OPENAPI_PATH, { method: 'GET' })
    return resp.ok
  } catch (e) {
    return false
  }
}

function startService() {
  if (yoloProcess) return yoloProcess
  // spawn detached process and redirect logs
  const out = fs.openSync('services/yolo/yolo.stdout.log', 'a')
  const err = fs.openSync('services/yolo/yolo.stderr.log', 'a')
  const proc = spawn('bash', [YOLO_SCRIPT], {
    detached: true,
    stdio: ['ignore', out, err],
    env: process.env
  })
  proc.unref()
  yoloProcess = proc
  return proc
}

async function waitForServiceReady(timeout = START_TIMEOUT) {
  const start = Date.now()
  while (Date.now() - start < timeout) {
    if (await isServiceAlive()) return true
    await new Promise(r => setTimeout(r, 500))
  }
  return false
}

export async function POST(req) {
  try {
    const form = await req.formData()
    const image = form.get('image')
    if (!image) return NextResponse.json({ ok: false, error: 'No image provided' }, { status: 400 })

    // Ensure YOLO service is running or start it
    if (!(await isServiceAlive())) {
      if (!startingPromise) {
        startingPromise = (async () => {
          startService()
          const ready = await waitForServiceReady()
          startingPromise = null
          return ready
        })()
      }

      const ready = await startingPromise
      if (!ready) {
        return NextResponse.json({ ok: false, error: 'Failed to start YOLO service' }, { status: 500 })
      }
    }

    // Proxy the image to the YOLO service
    const proxyForm = new FormData()
    // The incoming File / Blob can be appended directly
    proxyForm.append('image', image, image.name || 'upload.jpg')

    const resp = await fetch(YOLO_URL + '/process-document', { method: 'POST', body: proxyForm })
    const data = await resp.json().catch(async (e) => {
      const txt = await resp.text().catch(() => '')
      return { ok: false, error: 'Invalid response from YOLO service', raw: txt }
    })

    return NextResponse.json(data, { status: resp.status })
  } catch (err) {
    console.error('Error in /api/yolo/detect-corners:', err)
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 })
  }
}
