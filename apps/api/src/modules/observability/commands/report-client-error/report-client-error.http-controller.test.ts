import type { AddressInfo } from 'node:net'
import { FixedClock } from '#libs/adapters/fixed-clock'
import { InMemoryRateLimiter } from '#libs/adapters/in-memory-rate-limiter'
import { HttpRouter } from '#libs/http/router'
import { createHttpServer } from '#libs/http/server'
import { memoryLogger } from '#libs/jobs/testing/memory-logger'
import { clientErrorLimit, ReportClientErrorController } from './report-client-error.http-controller'

const closers: Array<() => Promise<void>> = []

const report = {
  kind: 'render',
  message: 'Cannot read properties of undefined',
  stack: 'TypeError: x\n    at draw (/assets/index-abc.js:1:2)',
  route: '/:organizationSlug/customers',
  release: 'web-3e75fa2',
  reference: 'a1b2c3d4e5f6'
}

/** The route on the real pipeline, with a logger that tags every line with the API's release as production does. */
async function serve() {
  const clock = new FixedClock(new Date('2026-11-19T10:00:00.000Z'))
  const memory = memoryLogger()
  const logger = memory.logger.child({ service: 'api', release: 'api-9f8e7d6' })
  const router = new HttpRouter()
  router.post(
    '/api/client-errors',
    new ReportClientErrorController({ limiter: new InMemoryRateLimiter(clock), logger }).handle
  )
  const server = createHttpServer({ router, logger })
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
  closers.push(() => new Promise<void>((resolve) => server.close(() => resolve())))
  const url = `http://127.0.0.1:${(server.address() as AddressInfo).port}/api/client-errors`
  const post = (body: unknown, address = '203.0.113.7') =>
    fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Client-IP': address },
      body: JSON.stringify(body)
    })
  const reported = () => memory.lines.filter((line) => line.msg === 'client error')
  return { post, reported, lines: memory.lines }
}

afterEach(async () => {
  await Promise.all(closers.splice(0).map((close) => close()))
})

describe('POST /api/client-errors (ADR 0072)', () => {
  it('answers 204 and leaves one line with the API release, the web release, the route and the reference', async () => {
    const { post, reported } = await serve()

    const response = await post(report)

    expect(response.status).toBe(204)
    expect(await response.text()).toBe('')
    expect(reported()).toEqual([
      expect.objectContaining({
        level: 40,
        service: 'api',
        release: 'api-9f8e7d6',
        reqId: expect.any(String),
        kind: 'render',
        clientRelease: 'web-3e75fa2',
        route: '/:organizationSlug/customers',
        reference: 'a1b2c3d4e5f6',
        clientMessage: report.message,
        clientStack: report.stack
      })
    ])
  })

  it('keeps a message that tries to forge a log line inside one field of one line', async () => {
    const { post, reported, lines } = await serve()
    const forged = 'boom\n{"level":50,"msg":"request failed","status":500}'

    await post({ ...report, message: forged })

    expect(reported()).toHaveLength(1)
    expect(reported()[0]?.clientMessage).toBe(forged)
    expect(lines.filter((line) => line.msg === 'request failed' && line.level === 50)).toEqual([])
  })

  it('refuses a body that is not a report, and logs no client error', async () => {
    const { post, reported } = await serve()

    const response = await post({ ...report, route: '/customers/ana@example.com?token=secret' })

    expect(response.status).toBe(400)
    expect(await response.json()).toMatchObject({ code: 'validation_failed' })
    expect(reported()).toEqual([])
  })

  it('counts the request before it reads the body: past the limit an address gets 429 with Retry-After', async () => {
    const { post, reported } = await serve()

    for (let sent = 0; sent < clientErrorLimit.max; sent++) expect((await post(report)).status).toBe(204)
    const refused = await post(report)

    expect(refused.status).toBe(429)
    expect(refused.headers.get('retry-after')).toBe(String(clientErrorLimit.windowSeconds))
    expect(reported()).toHaveLength(clientErrorLimit.max)
    // Another address has its own count.
    expect((await post(report, '198.51.100.9')).status).toBe(204)
  })
})
