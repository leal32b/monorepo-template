import { Writable } from 'node:stream'
import { createLogger } from './create-logger'

/** A destination that keeps each JSON line the logger writes. */
function memory() {
  const lines: Record<string, unknown>[] = []
  const stream = new Writable({
    write(chunk, _encoding, done) {
      lines.push(JSON.parse(String(chunk)))
      done()
    }
  })
  return { lines, stream }
}

describe('createLogger', () => {
  it('tags every line with the service and the release, beside pino’s own fields', () => {
    const { lines, stream } = memory()
    const logger = createLogger({ level: 'info', service: 'api', release: '3e75fa2' }, stream)

    logger.info({ reqId: 'r-1' }, 'request')

    expect(lines).toEqual([
      expect.objectContaining({
        level: 30,
        msg: 'request',
        reqId: 'r-1',
        service: 'api',
        release: '3e75fa2',
        pid: process.pid,
        hostname: expect.any(String),
        time: expect.any(Number)
      })
    ])
  })

  it('keeps lines below the level out', () => {
    const { lines, stream } = memory()
    const logger = createLogger({ level: 'warn', service: 'api', release: 'dev' }, stream)

    logger.info('not written')
    logger.warn('written')

    expect(lines.map((line) => line.msg)).toEqual(['written'])
  })

  it('redacts the secrets a library error may carry, though nothing logs them on purpose', () => {
    const { lines, stream } = memory()
    const logger = createLogger({ level: 'info', service: 'api', release: 'dev' }, stream)
    const secret = 'do-not-log'
    const err = Object.assign(new Error('upstream failed'), {
      headers: { authorization: `Bearer ${secret}`, cookie: secret, 'x-proxy-secret': secret, accept: 'text/html' },
      response: { headers: { 'set-cookie': [secret] } },
      config: { connectionString: `postgres://ada:${secret}@db/app`, password: secret }
    })

    logger.error({ err }, 'request failed')

    expect(JSON.stringify(lines)).not.toContain(secret)
    expect(lines[0]).toMatchObject({
      msg: 'request failed',
      err: {
        message: 'upstream failed',
        headers: {
          authorization: '[Redacted]',
          cookie: '[Redacted]',
          'x-proxy-secret': '[Redacted]',
          accept: 'text/html'
        },
        response: { headers: { 'set-cookie': '[Redacted]' } },
        config: { connectionString: '[Redacted]', password: '[Redacted]' }
      }
    })
  })

  it('writes to stdout when given no destination', () => {
    expect(createLogger({ level: 'silent', service: 'api', release: 'dev' }).level).toBe('silent')
  })
})
