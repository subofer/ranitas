export async function detectDocumentEdgesWorker(canvas, timeoutMs = 10000, signal = null) {
  if (typeof window === 'undefined' || typeof Worker === 'undefined') {
    throw new Error('Workers no disponibles en este entorno')
  }

  const worker = new Worker('/workers/opencv-worker.js')
  let timeoutId = null
  let aborted = false

  try {
    const imgBitmap = await createImageBitmap(canvas)

    const respPromise = new Promise((resolve, reject) => {
      worker.onmessage = async (ev) => {
        const d = ev.data
        if (d && d.ok) {
          let debugBitmap = null
          if (d.debugCanvas) {
            debugBitmap = d.debugCanvas
          }
          resolve({ points: d.points || null, debug: debugBitmap || null, diagnostics: d.diagnostics || null })
        }
        else if (d && d.ok === false) reject(new Error(d.error || 'Error en worker'))
        else resolve(null)
      }
      worker.onerror = (err) => reject(err)

      // Timeout guard
      timeoutId = setTimeout(() => {
        reject(new Error('Timeout worker'))
      }, timeoutMs)

      // AbortSignal support: if signal aborts, terminate worker and reject
      const onAbort = () => {
        aborted = true
        clearTimeout(timeoutId)
        try { worker.terminate() } catch (e) {}
        reject(new Error('Detección cancelada'))
      }

      if (signal && typeof signal.addEventListener === 'function') {
        if (signal.aborted) return onAbort()
        signal.addEventListener('abort', onAbort, { once: true })
      }

      // Post message with transfer of ImageBitmap
      worker.postMessage({ type: 'detect', imageBitmap: imgBitmap }, [imgBitmap])
    })

    const points = await respPromise
    return points
  } finally {
    if (timeoutId) clearTimeout(timeoutId)
    try { worker.terminate() } catch (e) {}
  }
}