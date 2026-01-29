/* eslint-env jest */
let GET

describe.skip('Docker models probe endpoint (requires ENABLE_DOCKER_QUERY=1, skipped by default)', () => {
  beforeAll(async () => {
    const mod = await import('../app/api/ai/docker/models/route.js')
    GET = mod.GET
  })

  test('returns disabled when env not set', async () => {
    delete process.env.ENABLE_DOCKER_QUERY
    const resp = await GET()
    const json = await resp.json()
    expect(json.ok).toBe(false)
    expect(resp.status).toBe(403)
  })
})
