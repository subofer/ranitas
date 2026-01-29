// Lightweight API helper for checking vision/ollama status (testable without JSX)
async function fetchVisionStatus(timeout = 5000) {
  try {
    const res = await fetch('/api/ai/status', { signal: AbortSignal.timeout(timeout) })
    if (!res || !res.ok) return null
    const data = await res.json()
    return data
  } catch (e) {
    return null
  }
}

module.exports = { fetchVisionStatus }