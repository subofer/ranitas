// Worker para ejecutar detección de documentos usando OpenCV.js
// Usar exclusivamente la versión local en /public/opencv/opencv.js (sin CDN)
// Esto evita dependencias externas y cumple con la política de instalación local

const sources = [
  '/opencv/opencv.js'
]

let cvReady = false
let cv = null
let loading = false

async function loadOpenCVWorker() {
  if (cvReady) return
  if (loading) return new Promise((resolve, reject) => {
    const check = setInterval(() => { if (cvReady) { clearInterval(check); resolve() } }, 100)
    setTimeout(() => { if (!cvReady) { clearInterval(check); reject(new Error('Timeout cargando OpenCV en worker')) } }, 10000)
  })

  loading = true

  for (const src of sources) {
    try {
      // Si es un recurso local, hacer un HEAD primero para evitar un 404 en la consola
      if (src.startsWith('/')) {
        try {
          const resp = await fetch(src, { method: 'HEAD' })
          if (!resp.ok) {
            console.warn('Worker: recurso local OpenCV no disponible en', src, 'status', resp.status)
            continue
          }
        } catch (e) {
          console.warn('Worker: comprobación HEAD fallida para', src, e.message)
          continue
        }
      }

      importScripts(src)
      // Esperar inicialización si Module.onRuntimeInitialized existe
      if (typeof Module !== 'undefined' && Module && typeof Module.onRuntimeInitialized === 'function') {
        await new Promise((resolve) => {
          const prev = Module.onRuntimeInitialized
          Module.onRuntimeInitialized = function () { try { if (prev) prev() } finally { resolve() } }
        })
      } else {
        // Pequeño poll hasta que cv esté disponible
        await new Promise((resolve, reject) => {
          const start = Date.now()
          const id = setInterval(() => {
            if (self.cv && self.cv.Mat) { clearInterval(id); resolve() }
            if (Date.now() - start > 10000) { clearInterval(id); reject(new Error('Timeout inicializando OpenCV en worker')) }
          }, 100)
        })
      }

      cv = self.cv
      cvReady = true
      return
    } catch (e) {
      // intentar siguiente fuente
      console.warn('Worker: fallo cargando OpenCV desde', src, e.message)
      continue
    }
  }

  throw new Error('No se pudo cargar OpenCV en el worker (todos los orígenes fallaron)')
}

function imageDataToMat(imageData) {
  const { width, height, data } = imageData
  const mat = new cv.Mat(height, width, cv.CV_8UC4)
  mat.data.set(new Uint8Array(data.buffer))
  return mat
}

function orderPoints(points) {
  const sorted = points.slice().sort((a, b) => a.y - b.y)
  const topPoints = sorted.slice(0, 2).sort((a, b) => a.x - b.x)
  const bottomPoints = sorted.slice(2, 4).sort((a, b) => a.x - b.x)
  return [topPoints[0], topPoints[1], bottomPoints[1], bottomPoints[0]]
}

async function detectOnImageData(imageBitmap) {
  // Dibuja en offscreen canvas
  const off = new OffscreenCanvas(imageBitmap.width, imageBitmap.height)
  const ctx = off.getContext('2d')
  ctx.drawImage(imageBitmap, 0, 0)
  const imageData = ctx.getImageData(0, 0, off.width, off.height)

  const src = imageDataToMat(imageData)
  const gray = new cv.Mat()
  cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY)

  const blurred = new cv.Mat()
  cv.GaussianBlur(gray, blurred, new cv.Size(5, 5), 0)

  const edges = new cv.Mat()
  cv.Canny(blurred, edges, 50, 150, 3, false)

  const dilated = new cv.Mat()
  const kernel = cv.getStructuringElement(cv.MORPH_RECT, new cv.Size(5, 5))
  cv.dilate(edges, dilated, kernel)

  const contours = new cv.MatVector()
  const hierarchy = new cv.Mat()
  cv.findContours(dilated, contours, hierarchy, cv.RETR_LIST, cv.CHAIN_APPROX_SIMPLE)

  let maxArea = 0
  let bestApprox = null

  for (let i = 0; i < contours.size(); i++) {
    const contour = contours.get(i)
    const area = cv.contourArea(contour)
    const minArea = (src.cols * src.rows) * 0.1
    if (area < minArea) continue

    const approx = new cv.Mat()
    const perimeter = cv.arcLength(contour, true)
    cv.approxPolyDP(contour, approx, 0.02 * perimeter, true)

    if (approx.rows === 4 && area > maxArea) {
      maxArea = area
      if (bestApprox) bestApprox.delete()
      bestApprox = approx
    } else {
      approx.delete()
    }
  }

  let detectedPoints = null
  const diagnostics = { contoursFound: contours.size(), candidates: [] }

  // Gather diagnostics for top contours
  const contourInfo = []
  for (let i = 0; i < contours.size(); i++) {
    const c = contours.get(i)
    const area = cv.contourArea(c)
    const perimeter = cv.arcLength(c, true)
    const approx = new cv.Mat()
    cv.approxPolyDP(c, approx, 0.02 * perimeter, true)
    // gather approx points (if small)
    const approxPoints = []
    for (let p = 0; p < approx.rows && p < 20; p++) {
      approxPoints.push({ x: approx.data32S[p*2], y: approx.data32S[p*2 + 1] })
    }
    contourInfo.push({ index: i, area, approxRows: approx.rows, perimeter, approxPoints })
    approx.delete()
    c.delete()
  }
  contourInfo.sort((a,b) => b.area - a.area)

  // Save top 5 for diagnostics
  diagnostics.candidates = contourInfo.slice(0,5)

  if (bestApprox && maxArea > 0) {
    const points = []
    for (let i = 0; i < bestApprox.rows; i++) {
      points.push({ x: bestApprox.data32S[i*2], y: bestApprox.data32S[i*2 + 1] })
    }
    detectedPoints = orderPoints(points)
  } else {
    // Fallbacks: try decreasing area threshold and relax approx epsilon
    let fallbackFound = false
    for (const eps of [0.04, 0.08, 0.12]) {
      let fallbackIdx = -1
      let fallbackArea = 0
      for (let i = 0; i < contours.size(); i++) {
        const contour = contours.get(i)
        const area = cv.contourArea(contour)
        if (area < (src.cols * src.rows) * 0.01) { contour.delete(); continue }
        const approx = new cv.Mat()
        const perimeter = cv.arcLength(contour, true)
        cv.approxPolyDP(contour, approx, eps * perimeter, true)
        if (approx.rows >= 4 && area > fallbackArea) {
          fallbackArea = area
          fallbackIdx = i
          if (bestApprox) bestApprox.delete()
          bestApprox = approx.clone()
          fallbackFound = true
        }
        approx.delete()
        contour.delete()
      }
      if (fallbackFound) break
    }
    if (fallbackFound && bestApprox) {
      const pts = []
      for (let i = 0; i < bestApprox.rows; i++) {
        pts.push({ x: bestApprox.data32S[i*2], y: bestApprox.data32S[i*2 + 1] })
      }
      detectedPoints = orderPoints(pts)
    } else {
      // As a last resort, use top candidate approxPoints or bounding box from candidate if available
      if (contourInfo && contourInfo.length > 0) {
        const top = contourInfo[0]
        if (top.approxPoints && top.approxPoints.length >= 4) {
          const pts = top.approxPoints.slice(0,4)
          detectedPoints = orderPoints(pts)
        } else if (top.approxPoints && top.approxPoints.length > 0) {
          // fallback bounding box based on approxPoints
          const xs = top.approxPoints.map(p => p.x)
          const ys = top.approxPoints.map(p => p.y)
          const minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys)
          detectedPoints = orderPoints([{x:minX,y:minY},{x:maxX,y:minY},{x:maxX,y:maxY},{x:minX,y:maxY}])
        }
      }
    }
  }

  // Create debug canvas (draw contours and bestApprox if exists)
  const debugCanvas = new OffscreenCanvas(src.cols, src.rows)
  const dctx = debugCanvas.getContext('2d')
  // draw original image
  dctx.drawImage(imageBitmap, 0, 0)
  dctx.strokeStyle = 'lime'
  dctx.lineWidth = 4

  // draw top candidate contours (approx if available)
  dctx.fillStyle = 'rgba(255,0,0,0.25)'
  for (let cIdx = 0; cIdx < Math.min(5, contourInfo.length); cIdx++) {
    const ci = contourInfo[cIdx]
    if (ci.approxPoints && ci.approxPoints.length >= 2) {
      dctx.beginPath()
      ci.approxPoints.forEach((pt, idx) => {
        if (idx === 0) dctx.moveTo(pt.x, pt.y)
        else dctx.lineTo(pt.x, pt.y)
      })
      dctx.closePath()
      dctx.stroke()
    }
  }

  if (detectedPoints) {
    dctx.fillStyle = 'rgba(0,255,0,0.6)'
    detectedPoints.forEach((pt, idx) => {
      dctx.beginPath(); dctx.arc(pt.x, pt.y, 12, 0, Math.PI*2); dctx.fill();
      dctx.fillStyle = 'white'; dctx.fillText(String(idx+1), pt.x+6, pt.y+6); dctx.fillStyle = 'rgba(0,255,0,0.6)'
    })
  } else {
    // draw centers of top candidates to help debugging
    dctx.fillStyle = 'rgba(255,165,0,0.6)'
    for (let i = 0; i < Math.min(5, contourInfo.length); i++) {
      const ci = contourInfo[i]
      if (ci.approxPoints && ci.approxPoints.length) {
        const xs = ci.approxPoints.map(p=>p.x)
        const ys = ci.approxPoints.map(p=>p.y)
        const cx = xs.reduce((a,b)=>a+b,0)/xs.length
        const cy = ys.reduce((a,b)=>a+b,0)/ys.length
        dctx.beginPath(); dctx.arc(cx, cy, 8, 0, Math.PI*2); dctx.fill();
      }
    }
  }

  // Cleanup mats
  src.delete(); gray.delete(); blurred.delete(); edges.delete(); dilated.delete(); kernel.delete(); contours.delete(); hierarchy.delete(); if (bestApprox) bestApprox.delete()

  return { points: detectedPoints, debugCanvas, diagnostics }
}

self.onmessage = async (ev) => {
  const msg = ev.data || {}
  if (msg.type === 'detect') {
    try {
      await loadOpenCVWorker()
      const bmp = msg.imageBitmap
      const res = await detectOnImageData(bmp)
      const points = res.points
      const diagnostics = res.diagnostics
      // Transfer result
      try {
        if (res.debugCanvas) {
          const debugBitmap = await createImageBitmap(res.debugCanvas)
          self.postMessage({ ok: true, points, debugCanvas: debugBitmap, diagnostics })
        } else {
          self.postMessage({ ok: true, points, diagnostics })
        }
      } catch (e) {
        self.postMessage({ ok: true, points, diagnostics })
      }
    } catch (e) {
      self.postMessage({ ok: false, error: e.message })
    }
  }
}
