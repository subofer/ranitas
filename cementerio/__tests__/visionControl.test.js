/* eslint-env jest */
let GET, POST
const child_process = require('child_process')

describe.skip('Vision control API (integration test - skipped in CI)', () => {
  beforeAll(async () => {
    const mod = await import('../app/api/ai/vision-control/route.js')
    GET = mod.GET
    POST = mod.POST
  })

  afterEach(() => {
    jest.resetAllMocks()
  })

  test('POST rejects invalid action', async () => {
    const req = new Request('http://localhost/api/ai/vision-control', { method: 'POST', body: JSON.stringify({ action: 'nope' }), headers: { 'content-type': 'application/json' } })
    const resp = await POST(req)
    const data = await resp.json()
    expect(data.ok).toBe(false)
    expect(resp.status).toBe(400)
  })

  test('POST logs action executes command', async () => {
    // Mock child_process.exec to simulate output
    jest.spyOn(child_process, 'exec').mockImplementation((cmd, opts, cb) => {
      cb(null, 'LOGS_OK', '')
    })

    const req = new Request('http://localhost/api/ai/vision-control', { method: 'POST', body: JSON.stringify({ action: 'logs' }), headers: { 'content-type': 'application/json' } })
    const resp = await POST(req)
    const data = await resp.json()
    expect(data.ok).toBe(true)
    expect(data.output).toEqual(expect.stringContaining('LOGS_OK'))
  })

  test('GET returns vision status (proxy)', async () => {
    global.fetch = jest.fn(() => Promise.resolve({ ok: true, json: async () => ({ qwen_model_loaded: true }) }))
    const resp = await GET()
    const data = await resp.json()
    expect(data.ok).toBe(true)
    expect(data.status.qwen_model_loaded).toBe(true)
  })
})
