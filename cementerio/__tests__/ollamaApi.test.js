const { fetchVisionStatus } = require('../app/context/ollamaApi')

describe('fetchVisionStatus', () => {
  beforeEach(() => {
    global.fetch = jest.fn(() => Promise.resolve({ ok: true, json: async () => ({ ok: true, use_ollama: true, ollama_available: true, ollama_model_loaded: true, loadedModels: [{name: 'qwen2.5vl:7b'}] }) }))
  })

  afterEach(() => {
    jest.resetAllMocks()
  })

  test('returns parsed data when API responds', async () => {
    const data = await fetchVisionStatus(1000)
    expect(data).not.toBeNull()
    expect(data.use_ollama).toBe(true)
    expect(Array.isArray(data.loadedModels)).toBe(true)
  })

  test('returns null on network error', async () => {
    global.fetch = jest.fn(() => Promise.reject(new Error('network')))
    const data = await fetchVisionStatus(1000)
    expect(data).toBeNull()
  })
})
