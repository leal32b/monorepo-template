import pino from 'pino'
import { createPool } from './database'

describe('createPool', () => {
  it('logs a lost idle connection instead of crashing the process', async () => {
    const logger = pino({ level: 'silent' })
    const warn = vi.spyOn(logger, 'warn')
    const pool = createPool('postgres://localhost/unused', logger)

    pool.emit('error', new Error('terminating connection due to administrator command'))

    expect(warn).toHaveBeenCalledWith(
      expect.objectContaining({ err: expect.any(Error) }),
      'idle database connection lost'
    )
    await pool.end()
  })
})
