import type { AddressInfo } from 'node:net'
import { publicOrganizationSchema } from '@repo/contracts'
import { FixedClock } from '#libs/adapters/fixed-clock'
import { InMemoryRateLimiter } from '#libs/adapters/in-memory-rate-limiter'
import { sendJson } from '#libs/http/json'
import { HttpRouter } from '#libs/http/router'
import { createHttpServer } from '#libs/http/server'
import { memoryLogger } from '#libs/jobs/testing/memory-logger'
import { publicLimits, publicRoute } from './public-route'
import { GetPublicOrganizationController } from './queries/get-public-organization/get-public-organization.http-controller'
import { FakePublicOrganizations } from './testing/fake-public-organizations'

const closers: Array<() => Promise<void>> = []
const acme = { id: 'org-acme', name: 'Acme Barbers', slug: 'acme', timeZone: 'America/Sao_Paulo', currency: 'BRL' }

/** The public profile, and a write that says which organization it was given, on the real pipeline. */
async function serve() {
  const clock = new FixedClock(new Date('2026-11-12T10:00:00.000Z'))
  const { logger } = memoryLogger()
  const organizations = new FakePublicOrganizations([acme])
  const surface = { limiter: new InMemoryRateLimiter(clock), organizations, logger }
  const router = new HttpRouter()
  router.get('/api/public/organizations/:organizationSlug', new GetPublicOrganizationController(surface).handle)
  router.post(
    '/api/public/organizations/:organizationSlug/echo',
    publicRoute(surface, publicLimits.write, (_req, res, { organization }) => sendJson(res, 200, organization))
  )
  const server = createHttpServer({ router, logger })
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
  closers.push(() => new Promise<void>((resolve) => server.close(() => resolve())))
  const url = `http://127.0.0.1:${(server.address() as AddressInfo).port}/api/public/organizations`
  const call = (method: string, path: string, address = '203.0.113.7') =>
    fetch(`${url}/${path}`, { method, headers: { 'X-Client-IP': address } })
  const problem = async (response: Response) => {
    const { status, code, detail } = (await response.json()) as { status: number; code: string; detail: string }
    return { status, code, detail }
  }
  return { call, problem, clock, organizations }
}

afterEach(async () => {
  await Promise.all(closers.splice(0).map((close) => close()))
})

describe('the public tenant surface (ADR 0059)', () => {
  it('reads an organization by its slug without a session, as its public profile and nothing more', async () => {
    const { call } = await serve()

    const response = await call('GET', 'acme')

    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body).toEqual({ name: 'Acme Barbers', slug: 'acme', timeZone: 'America/Sao_Paulo', currency: 'BRL' })
    expect(publicOrganizationSchema.safeParse(body).success).toBe(true)
  })

  it('answers the same 404 for an unknown slug on a read and on a write', async () => {
    const { call, problem } = await serve()
    const unknown = { status: 404, code: 'organization_not_found', detail: 'No organization has this address.' }

    expect(await problem(await call('GET', 'nobody'))).toEqual(unknown)
    expect(await problem(await call('POST', 'nobody/echo'))).toEqual(unknown)
  })

  it('refuses a slug that cannot be one without looking it up', async () => {
    const { call, organizations } = await serve()

    expect((await call('GET', 'Not%20A%20Slug')).status).toBe(404)
    expect((await call('GET', 'settings')).status).toBe(404)
    expect(organizations.lookups).toEqual([])
  })

  it('hands the handler the organization, whose id a use case runs in', async () => {
    const { call } = await serve()

    expect(await (await call('POST', 'acme/echo')).json()).toEqual(acme)
  })

  it('counts a miss like a hit: 60 reads a minute per address, then 429 until the window ends', async () => {
    const { call, clock, organizations } = await serve()
    for (let i = 0; i < 60; i++) await call('GET', i % 2 === 0 ? 'acme' : 'nobody')
    const lookups = organizations.lookups.length

    const refused = await call('GET', 'acme')

    expect(refused.status).toBe(429)
    expect(refused.headers.get('retry-after')).toBe('60')
    expect((await call('GET', 'nobody')).status).toBe(429)
    expect(organizations.lookups).toHaveLength(lookups)
    expect((await call('GET', 'acme', '203.0.113.8')).status).toBe(200)

    clock.advance(60_000)
    expect((await call('GET', 'acme')).status).toBe(200)
  })

  it('limits writes apart from reads: 10 in 10 minutes per address', async () => {
    const { call, clock } = await serve()
    for (let i = 0; i < 10; i++) expect((await call('POST', 'acme/echo')).status).toBe(200)

    const refused = await call('POST', 'acme/echo')

    expect(refused.status).toBe(429)
    expect(refused.headers.get('retry-after')).toBe('600')
    expect((await call('GET', 'acme')).status).toBe(200)

    clock.advance(600_000)
    expect((await call('POST', 'acme/echo')).status).toBe(200)
  })
})
