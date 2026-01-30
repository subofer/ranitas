// Minimal mapper that relies on the authoritative 'vision-ai' payload structure.
// Keeps transformations minimal and predictable (we control the service JSON).
// Helper: derive explicit model names from the service payload. Returns an array of string names.
function ensureLoadedModelsNames(payload) {
  const names = []

  if (!payload || typeof payload !== 'object') return names

  // If loadedModels provided explicitly, prefer it
  if (Array.isArray(payload.loadedModels) && payload.loadedModels.length > 0) {
    for (const m of payload.loadedModels) names.push(typeof m === 'string' ? m : (m.name || m.model || String(m)))
    return Array.from(new Set(names))
  }

  // Collect from subsystems
  for (const k of Object.keys(payload)) {
    const sub = payload[k]
    if (sub && Array.isArray(sub.models) && sub.models.length > 0) {
      for (const m of sub.models) names.push(m)
    } else if (sub && typeof sub.model === 'string') {
      names.push(sub.model)
    } else if (sub && typeof sub.model_name === 'string') {
      names.push(sub.model_name)
    }
  }

  // Do not invent model names: only return names explicitly present in the payload
  // If a subsystem (yolo/docres/ollama) exposes explicit model fields or `models` arrays they will be collected above.
  // This keeps the UI truthful and removes heuristics that injected inferred defaults.

  return Array.from(new Set(names))
}

function mapStatusData(data, containerInfo = {}) {
  const loadedModels = []

  if (data && data.service === 'vision-ai') {
    // Prefer the authoritative `models` array provided by the vision service when present.
    // This allows the UI to show models as they are discovered/loaded by the service.
    const explicitNames = Array.isArray(data.models) && data.models.length > 0 ? data.models : ensureLoadedModelsNames(data)
    for (const n of explicitNames) loadedModels.push({ name: n, loaded: true })
  } else if (data?.loadedModels && Array.isArray(data.loadedModels) && data.loadedModels.length > 0) {
    // Handle our backend format
    for (const m of data.loadedModels) {
      if (typeof m === 'string') loadedModels.push({ name: m, loaded: true })
      else if (m && typeof m === 'object') loadedModels.push({ name: m.name || m.model || String(m), loaded: true })
    }
  } else if (data?.models && Array.isArray(data.models) && data.models.length > 0) {
    // Handle models array directly
    for (const m of data.models) {
      if (typeof m === 'string') loadedModels.push({ name: m, loaded: true })
      else if (m && typeof m === 'object') loadedModels.push({ name: m.name || m.model || String(m), loaded: true })
    }
  }

  const status = {
    gpu: data?.gpu || data?.cuda?.gpu || data?.gpu_name || null,
    vram_gb: (typeof data?.vram_total === 'number' && data.vram_total) || data?.vram || null,
    vram_used: data?.vram_total && data?.vram_free ? Math.round((data.vram_total - data.vram_free) * 100) / 100 : null,
    uptime: data?.uptime || null,
    cpu: data?.cpu || null,
    loadedModels: loadedModels,  // Add loadedModels to status for UI compatibility
    // keep raw subsystem objects for the UI (they reflect actual service state)
    yolo: data?.yolo || null,
    services: data?.services || null,
    events: Array.isArray(data?.events) ? data.events.slice(-50) : null,
    container: containerInfo
  }

  return { loadedModels, status }
}

module.exports = { mapStatusData, ensureLoadedModelsNames }
