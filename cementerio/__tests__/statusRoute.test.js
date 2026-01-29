/* eslint-env jest */
const { mapStatusData } = require('../lib/statusMapper')

describe('Status mapper', () => {
  test('parses vision-ai payload into loadedModels (ollama + yolo present with derived name)', () => {
    const sample = {
      ok: true,
      service: 'vision-ai',
      cuda: { deviceCount: 1 },
      ollama: { ready: true, models: ['qwen2.5vl:7b'], configured_model: 'qwen2.5vl:7b' },
      yolo: { loaded: true, path: '/app/models/yolov26l-seg.pt', model: 'yolov26l-seg' }
    }

    // ensureLoadedModelsNames will pick up the explicit yolo.model
    const { ensureLoadedModelsNames } = require('../lib/statusMapper')
    const names = ensureLoadedModelsNames(sample)
    expect(names).toEqual(expect.arrayContaining(['qwen2.5vl:7b', 'yolov26l-seg']))

    const parsed = mapStatusData(sample, { docker_probe: false })
    const pnames = (parsed.loadedModels || []).map(m => m.name)
    expect(pnames).toEqual(expect.arrayContaining(['qwen2.5vl:7b', 'yolov26l-seg']))
  })

  test('respects legacy loadedModels array', () => {
    const legacy = { ok: true, loadedModels: ['legacy/model:1', { name: 'obj' }] }
    const parsed = mapStatusData(legacy)
    const names = (parsed.loadedModels || []).map(m => m.name)
    expect(names).toEqual(expect.arrayContaining(['legacy/model:1', 'obj']))
  })
})
