// Worker para ejecutar detección de documentos usando OpenCV.js
// Intenta cargar primero la versión local '/opencv/opencv.js', luego el CDN

const sources = [
  '/opencv/opencv.js',
  'https://docs.opencv.org/4.x/opencv.js'
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
  if (bestApprox && maxArea > 0) {
    const points = []
    for (let i = 0; i < bestApprox.rows; i++) {
      points.push({ x: bestApprox.data32S[i*2], y: bestApprox.data32S[i*2 + 1] })
    }
    detectedPoints = orderPoints(points)
  }

  // Cleanup
  src.delete(); gray.delete(); blurred.delete(); edges.delete(); dilated.delete(); kernel.delete(); contours.delete(); hierarchy.delete(); if (bestApprox) bestApprox.delete()

  return detectedPoints
}

self.onmessage = async (ev) => {
  const msg = ev.data || {}
  if (msg.type === 'detect') {
    try {
      await loadOpenCVWorker()
      const bmp = msg.imageBitmap
      const points = await detectOnImageData(bmp)
      // Transfer result
      self.postMessage({ ok: true, points })
    } catch (e) {
      self.postMessage({ ok: false, error: e.message })
    }
  }
}
