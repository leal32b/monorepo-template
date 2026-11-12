import pino from 'pino'
import { CONNECT_TIMEOUT_MS, createPool, isDatabaseUnavailable, QUERY_TIMEOUT_MS } from './database'

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

  it('limits connecting, waiting for a free connection and each statement', async () => {
    const pool = createPool('postgres://localhost/unused', pino({ level: 'silent' }))

    expect(pool.options).toMatchObject({
      connectionTimeoutMillis: CONNECT_TIMEOUT_MS,
      query_timeout: QUERY_TIMEOUT_MS
    })
    expect(QUERY_TIMEOUT_MS).toBeGreaterThan(10_000) // after the database's own statement_timeout
    await pool.end()
  })

  it('keeps five connections unless told otherwise', async () => {
    const usual = createPool('postgres://localhost/unused', pino({ level: 'silent' }))
    const single = createPool('postgres://localhost/unused', pino({ level: 'silent' }), { maxConnections: 1 })

    expect(usual.options.max).toBe(5)
    expect(single.options.max).toBe(1)
    await usual.end()
    await single.end()
  })

  it('takes another statement deadline, or none', async () => {
    const pool = createPool('postgres://localhost/unused', pino({ level: 'silent' }), { queryTimeoutMs: 0 })

    expect(pool.options).toMatchObject({ connectionTimeoutMillis: CONNECT_TIMEOUT_MS, query_timeout: 0 })
    await pool.end()
  })
})

const withCode = (code: string) => Object.assign(new Error('failed'), { code })

describe('isDatabaseUnavailable', () => {
  it.each([
    'timeout exceeded when trying to connect',
    'Connection terminated due to connection timeout',
    'Query read timeout',
    'Connection terminated unexpectedly'
  ])('is true for the pool or the client giving up: %s', (message) => {
    expect(isDatabaseUnavailable(new Error(message))).toBe(true)
  })

  it.each(['57014', '25P03', '57P01', '57P03', '53300', '08006', '08001', 'ECONNREFUSED', 'ENOTFOUND'])(
    'is true for the code %s',
    (code) => {
      expect(isDatabaseUnavailable(withCode(code))).toBe(true)
    }
  )

  it.each([
    ['a constraint violation', withCode('23505')],
    ['a syntax error', withCode('42601')],
    ['an error with a numeric code', Object.assign(new Error('failed'), { code: 57014 })],
    ['a plain error', new Error('boom')],
    ['something that is not an error', 'Query read timeout']
  ])('is false for %s', (_name, error) => {
    expect(isDatabaseUnavailable(error)).toBe(false)
  })
})
