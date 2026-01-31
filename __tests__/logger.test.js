describe('logger buffer', () => {
  test('getLogs returns appended messages', async () => {
    const loggerModule = await import('../lib/logger.js')
    const logger = loggerModule.default
    const before = logger.getLogs(10).length
    logger.info('test-entry', '[test]')
    const logs = logger.getLogs(10)
    expect(logs.length).toBeGreaterThanOrEqual(Math.min(10, before + 1))
    const last = logs[logs.length - 1]
    expect(String(last.msg)).toContain('test-entry')
  })
})
