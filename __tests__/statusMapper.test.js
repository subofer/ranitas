const { mapStatusData } = require('../lib/statusMapper')

describe('statusMapper', () => {
  test('maps models and events from vision-ai payload', () => {
    const payload = {
      service: 'vision-ai',
      models: ['a', 'b'],
      events: [{ ts: 't', service: 'yolo', message: 'loaded', level: 'info' }],
      cuda: { gpu: 'GPU', vram_gb: 16, vram_used: 4 }
    }

    const { loadedModels, status } = mapStatusData(payload, { container_candidate: 'ranitas-vision' })
    expect(loadedModels).toEqual([{ name: 'a', loaded: true }, { name: 'b', loaded: true }])
    expect(status.events).toBeDefined()
    expect(status.vram_gb).toBe(16)
    expect(status.vram_used).toBe(4)
  })
})