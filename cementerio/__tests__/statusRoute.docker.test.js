/* eslint-env jest */
const child_process = require('child_process')

let GET

describe.skip('Status route Docker probe (integration, skipped in CI)', () => {
  beforeAll(async () => {
    const mod = await import('../app/api/ai/status/route.js')
    GET = mod.GET
  })

  afterEach(() => {
    jest.resetAllMocks()
    delete process.env.ENABLE_DOCKER_QUERY
  })

  test('discovers container name from docker ps and uses it for docker exec', async () => {
    process.env.ENABLE_DOCKER_QUERY = '1'

    // Mock exec to respond according to the command invoked
    jest.spyOn(child_process, 'exec').mockImplementation((cmd, opts, cb) => {
      if (cmd && cmd.startsWith('docker ps')) {
        // Simulate a container with a name containing 'ranitas_vision' and image 'ranitas-vision:latest'
        const out = 'abcd1234 ranitas_vision_1 ranitas-vision:latest Up 2 minutes\n'
        return cb(null, out, '')
      }
      if (cmd && cmd.includes('curl')) {
        // Simulate curl inside container returning JSON + status marker
        const body = JSON.stringify({ ok: true, service: 'vision-ai', ollama: { ready: true, models: ['qwen2.5vl:7b'] } }) + '\n__STATUS_CODE__:200'
        return cb(null, body, '')
      }
      if (cmd && cmd.includes('ollama list')) {
        // Not expected in this flow, but return empty
        return cb(null, '[]', '')
      }
      return cb(new Error('Unknown command'))
    })

    const resp = await GET()
    const json = await resp.json()

    expect(json.ok).toBe(true)
    expect(json.status).toBeDefined()
    expect(json.status.container).toBeDefined()
    // Ensure container_candidate was detected and included in returned container info
    expect(json.status.container.container_candidate).toBeDefined()
    expect(json.loadedModels.map(m => m.name)).toEqual(expect.arrayContaining(['qwen2.5vl:7b']))
  })
})
