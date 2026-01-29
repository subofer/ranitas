/* eslint-env jest */
const child_process = require('child_process')

describe('discoverContainer', () => {
  afterEach(() => jest.resetAllMocks())

  test('finds a container matching ranitas/vision from docker ps output', async () => {
    jest.spyOn(child_process, 'exec').mockImplementation((cmd, opts, cb) => {
      const out = 'abcd1234 ranitas_vision_1 ranitas-vision:latest Up 2 minutes\n'
      cb(null, out, '')
    })

    const { discoverContainer } = require('../lib/dockerDiscover')
    const result = await discoverContainer()
    // Candidate should reference the container or image with 'ranitas'/'vision'
    expect(result.candidate).toBeDefined()
    expect(String(result.candidate).toLowerCase()).toMatch(/ranitas|vision/)
    expect(result.ps_raw).toContain('ranitas_vision_1')
  })

  test('falls back to first container name when no match', async () => {
    jest.spyOn(child_process, 'exec').mockImplementation((cmd, opts, cb) => {
      const out = 'id1 first_container some-image:latest Up 1 minute\nid2 second_container other:latest Up 2 minutes\n'
      cb(null, out, '')
    })

    const { discoverContainer } = require('../lib/dockerDiscover')
    const result = await discoverContainer()
    expect(result.candidate).toBe('first_container')
  })

  test('returns null candidate on error', async () => {
    jest.spyOn(child_process, 'exec').mockImplementation((cmd, opts, cb) => {
      cb(new Error('docker not available'))
    })

    const { discoverContainer } = require('../lib/dockerDiscover')
    const result = await discoverContainer()
    expect(result.candidate).toBeNull()
    expect(result.error).toBeDefined()
  })
})
