import type { AddressInfo } from 'node:net'
import { apiProblemSchema } from '@repo/contracts'
import { FixedClock } from '#libs/adapters/fixed-clock'
import { InMemoryRateLimiter } from '#libs/adapters/in-memory-rate-limiter'
import { memoryLogger } from '#libs/jobs/testing/memory-logger'
import { sendJson } from './json'
import { enforceRateLimit } from './rate-limit'
import { HttpRouter } from './router'
import { createHttpServer } from './server'

const closers: Array<() => Promise<void>> = []
const twice = { name: 'test-twice', max: 2, windowSeconds: 60 }

/** One route behind the limiter, on the real pipeline. */
async function serve() {
  const clock = new FixedClock(new Date('2026-11-12T10:00:00.000Z'))
  const { logger, lines } = memoryLogger()
  const limiter = new InMemoryRateLimiter(clock)
  const router = new HttpRouter()
  router.get('/limited', async (req, res, { requestId }) => {
    await enforceRateLimit({ limiter, logger }, req, twice, requestId)
    sendJson(res, 200, { ok: true })
  })
  const server = createHttpServer({ router, logger })
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
  closers.push(() => new Promise<void>((resolve) => server.close(() => resolve())))
  const url = `http://127.0.0.1:${(server.address() as AddressInfo).port}/limited`
  const call = (address?: string) =>
    fetch(url, { headers: address === undefined ? {} : { 'X-Client-IP': address, 'X-Request-Id': 'req-1' } })
  return { call, clock, lines }
}

afterEach(async () => {
  await Promise.all(closers.splice(0).map((close) => close()))
})

describe('enforceRateLimit (ADR 0059)', () => {
  it('answers 429 with Retry-After past the limit, and serves again after the window', async () => {
    const { call, clock } = await serve()
    expect((await call('203.0.113.7')).status).toBe(200)
    expect((await call('203.0.113.7')).status).toBe(200)

    clock.advance(15_000)
    const refused = await call('203.0.113.7')

    expect(refused.status).toBe(429)
    expect(refused.headers.get('retry-after')).toBe('45')
    expect(apiProblemSchema.parse(await refused.json())).toMatchObject({
      status: 429,
      code: 'rate_limited',
      detail: 'Too many requests from this address. Try again in 45 seconds.',
      retryAfter: 45
    })

    clock.advance(45_000)
    expect((await call('203.0.113.7')).status).toBe(200)
  })

  it('counts each address apart, and an IPv6 block as one', async () => {
    const { call } = await serve()
    await call('203.0.113.7')
    await call('203.0.113.7')

    expect((await call('203.0.113.8')).status).toBe(200)

    await call('2001:db8:0:1::1')
    await call('2001:db8:0:1::2')
    expect((await call('2001:db8:0:1:ffff::3')).status).toBe(429)
    expect((await call('2001:db8:0:2::1')).status).toBe(200)
  })

  it('counts every request without an address in one bucket, so the limit still holds', async () => {
    const { call } = await serve()
    await call()
    await call('not an address')

    expect((await call()).status).toBe(429)
    expect((await call('203.0.113.7')).status).toBe(200)
  })

  it('says in the log which limit was reached, without the address', async () => {
    const { call, lines } = await serve()
    await call('203.0.113.7')
    await call('203.0.113.7')
    await call('203.0.113.7')

    const line = lines.find((entry) => entry.msg === 'rate limited')
    expect(line).toEqual({ level: 40, reqId: 'req-1', limit: 'test-twice', retryAfterSeconds: 60, msg: 'rate limited' })
    expect(JSON.stringify(lines)).not.toContain('203.0.113.7')
  })
})
