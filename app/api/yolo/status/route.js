import { NextResponse } from 'next/server'
import { spawn } from 'node:child_process'
import fs from 'node:fs'

let yoloProcess = null
let startingPromise = null

const YOLO_SCRIPT = 'scripts/run-yolo.sh'
const YOLO_URL = 'http://127.0.0.1:8000'
const STATUS_PATH = YOLO_URL + '/status'
const START_TIMEOUT = 20000 // ms

async function isServiceAlive() {
  try {
    const resp = await fetch(YOLO_URL + '/openapi.json', { method: 'GET' })
    return resp.ok
  } catch (e) {
    return false
  }
}

function startService() {
  if (yoloProcess) return yoloProcess
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

export async function GET(req) {
  try {
    // Start YOLO service if not alive (same behavior as other yolo routes)
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

    const resp = await fetch(STATUS_PATH, { method: 'GET' })
    const data = await resp.json().catch(async (e) => {
      const txt = await resp.text().catch(() => '')
      return { ok: false, error: 'Invalid response from YOLO status', raw: txt }
    })

    return NextResponse.json(data, { status: resp.status })
  } catch (err) {
    console.error('/api/yolo/status error', err)
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 })
  }
}