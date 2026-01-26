export async function GET() {
  const encoder = new TextEncoder()
  let closed = false

  const stream = new ReadableStream({
    start(controller) {
      // Polling loop running on server side; emits SSE events
      let lastModelsJson = ''
      let heartbeatCounter = 0

      const fetchModels = async () => {
        try {
          const resp = await fetch('http://localhost:11434/api/ps')
          if (!resp.ok) throw new Error(`Ollama HTTP ${resp.status}`)
          const json = await resp.json()
          const models = (json?.models || []).map(m => ({ name: m.name || m.model, sizeVram: m.size_vram || 0, size: m.size || 0, expiresAt: m.expires_at }))
          return { ok: true, models }
        } catch (err) {
          return { ok: false, error: err.message }
        }
      }

      const send = (event, data) => {
        try {
          controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`))
        } catch (e) {
          // If enqueue fails, probably client disconnected
          closed = true
        }
      }

      const loop = async () => {
        while (!closed) {
          try {
            const res = await fetchModels()
            if (res.ok) {
              const modelsJson = JSON.stringify(res.models)
              // Send only when changed
              if (modelsJson !== lastModelsJson) {
                lastModelsJson = modelsJson
                send('models', { loadedModels: res.models, count: res.models.length })
              }
            } else {
              send('error', { error: res.error })
            }
          } catch (e) {
            send('error', { error: e.message })
          }

          // Heartbeat every ~25s (every 5 iterations of 5s sleep)
          heartbeatCounter = (heartbeatCounter + 1) % 5
          if (heartbeatCounter === 0) send('heartbeat', { ts: Date.now() })

          // Sleep 5s between polls (mejor balance entre responsividad y carga)
          await new Promise(resolve => setTimeout(resolve, 5000))
        }

        try { controller.close() } catch (e) {}
      }

      loop()
    },
    cancel() {
      closed = true
    }
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive'
    }
  })
}
