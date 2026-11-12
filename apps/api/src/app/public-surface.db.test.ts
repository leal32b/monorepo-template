import type { Server } from 'node:http'
import type { AddressInfo } from 'node:net'
import { fileURLToPath } from 'node:url'
import { apiProblemSchema, publicCustomerRegistrationSchema, publicOrganizationSchema } from '@repo/contracts'
import { sql } from 'kysely'
import { inject } from 'vitest'
import { FixedClock } from '#libs/adapters/fixed-clock'
import { ManualTimer } from '#libs/adapters/manual-timer'
import { RecordingEmailSender } from '#libs/adapters/recording-email-sender'
import { createDatabase, createPool } from '#libs/database/database'
import { runMigrations } from '#libs/database/migrations'
import { memoryLogger } from '#libs/jobs/testing/memory-logger'
import { kyselyCustomersUnitOfWork } from '#modules/customers/database/kysely-customers-unit-of-work'
import { registerCustomer } from '#modules/customers/domain/customer'
import { resetDatabase } from '../../test/reset-database'
import { createApp } from './create-app'
import { createJobs } from './create-jobs'

const webOrigin = 'http://localhost:5173'
const proxySecret = 'the-worker-secret'
const migrations = fileURLToPath(new URL('../../migrations/', import.meta.url))

/** The whole API on Postgres, as a visitor reaches it: through the Worker, with no session (ADR 0059). */
describe('the public tenant surface on the database (ADR 0059)', () => {
  const { logger, lines } = memoryLogger()
  const db = createDatabase(createPool(inject('databaseUrl'), logger))
  const clock = new FixedClock(new Date('2026-11-12T10:00:00.000Z'))
  const jobs = createJobs({
    db,
    clock,
    logger,
    emailSender: new RecordingEmailSender(),
    timer: new ManualTimer(clock),
    idlePollMs: 3_600_000
  })
  let server: Server
  let url: string
  let lastAddress = 0

  beforeAll(async () => {
    await resetDatabase(db)
    await runMigrations(db, migrations)
    await sql`insert into auth.organization (id, name, slug, "createdAt", "timeZone", currency)
      values ('org-acme', 'Acme Barbers', 'acme', now(), 'America/Sao_Paulo', 'BRL'),
             ('org-other', 'Other Barbers', 'other', now(), 'UTC', 'USD')`.execute(db)
    server = createApp({
      clock,
      logger,
      serviceName: 'api',
      release: 'test',
      webOrigin,
      corsOrigins: [],
      proxySecret,
      db,
      jobs: jobs.queue,
      authSecret: 'fedcba9876543210'.repeat(2),
      google: undefined
    })
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
    url = `http://127.0.0.1:${(server.address() as AddressInfo).port}/api/public/organizations`
  })

  beforeEach(async () => {
    await sql`truncate customer, customer_change, rate_limit`.execute(db)
    lines.length = 0
  })

  afterAll(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()))
    await db.destroy()
  })

  /** Each test's calls come from an address of its own unless it names one: only the limit under test counts. */
  const nextAddress = () => `198.51.100.${++lastAddress}`

  /** What the Worker forwards for a visitor: its secret and the client address, no cookie. */
  const worker = (address: string) => ({ 'X-Proxy-Secret': proxySecret, 'X-Client-IP': address })

  const read = (slug: string, address = nextAddress()) => fetch(`${url}/${slug}`, { headers: worker(address) })

  const register = (slug: string, body: unknown, address = nextAddress()) =>
    fetch(`${url}/${slug}/customer-registrations`, {
      method: 'POST',
      headers: { ...worker(address), Origin: webOrigin, 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    })

  const customersOf = async (organizationId: string) =>
    (
      await sql<{ name: string; email: string | null }>`
        select name, email from customer where organization_id = ${organizationId} order by name
      `.execute(db)
    ).rows

  const changesOf = async (organizationId: string) =>
    (
      await sql`
        select action, actor_kind, actor_id from customer_change where organization_id = ${organizationId}
      `.execute(db)
    ).rows

  const problem = async (response: Response) => {
    const { status, code, detail } = apiProblemSchema.parse(await response.json())
    return { status, code, detail }
  }

  it('reads an organization by its slug with no session: its public profile, with no id', async () => {
    const response = await read('acme')

    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body).toEqual({ name: 'Acme Barbers', slug: 'acme', timeZone: 'America/Sao_Paulo', currency: 'BRL' })
    expect(publicOrganizationSchema.safeParse(body).success).toBe(true)
  })

  it('registers a visitor with no session as a customer of that organization, created by a visitor', async () => {
    const response = await register('acme', { name: 'Grace Hopper', email: 'grace@example.com' })

    expect(response.status).toBe(202)
    expect(publicCustomerRegistrationSchema.parse(await response.json())).toEqual({ received: true })
    expect(await customersOf('org-acme')).toEqual([{ name: 'Grace Hopper', email: 'grace@example.com' }])
    expect(await changesOf('org-acme')).toEqual([{ action: 'created', actor_kind: 'visitor', actor_id: null }])
  })

  it('writes in the organization its slug names and no other, and each keeps its own emails', async () => {
    await register('acme', { name: 'Grace Hopper', email: 'grace@example.com' })
    await register('other', { name: 'Grace H.', email: 'grace@example.com' })
    await register('acme', { name: 'Ada', phone: '555 0100' })

    expect(await customersOf('org-acme')).toEqual([
      { name: 'Ada', email: null },
      { name: 'Grace Hopper', email: 'grace@example.com' }
    ])
    expect(await customersOf('org-other')).toEqual([{ name: 'Grace H.', email: 'grace@example.com' }])
    expect(await changesOf('org-other')).toHaveLength(1)
  })

  it('cannot write a row of another organization: Postgres refuses it, whatever the code says', async () => {
    const unitOfWork = kyselyCustomersUnitOfWork(db)
    const foreign = registerCustomer({
      id: 'c-foreign',
      changeId: 'ch-foreign',
      organizationId: 'org-other',
      now: clock.now(),
      details: { name: 'Mallory', email: null, phone: '555 0199' }
    })

    // The transaction of a public write to `acme`, handed rows that name `other`.
    await expect(unitOfWork.run('org-acme', ({ customers }) => customers.insert(foreign.customer))).rejects.toThrow(
      /row-level security/
    )
    await expect(unitOfWork.run('org-acme', ({ changes }) => changes.append(foreign.change))).rejects.toThrow(
      /row-level security/
    )
    expect(await customersOf('org-other')).toEqual([])
  })

  it('answers the same for an email that is already a customer, and keeps the customer as it was', async () => {
    await register('acme', { name: 'Grace Hopper', email: 'grace@example.com' })

    const again = await register('acme', { name: 'Someone else', email: 'GRACE@example.com' })

    expect(again.status).toBe(202)
    expect(await again.json()).toEqual({ received: true })
    expect(await customersOf('org-acme')).toEqual([{ name: 'Grace Hopper', email: 'grace@example.com' }])
    expect(await changesOf('org-acme')).toHaveLength(1)
  })

  it('answers an unknown slug the same on the read and on the write, valid body or not', async () => {
    const unknown = { status: 404, code: 'organization_not_found', detail: 'No organization has this address.' }

    expect(await problem(await read('nobody'))).toEqual(unknown)
    expect(await problem(await register('nobody', { name: 'Grace', email: 'grace@example.com' }))).toEqual(unknown)
    expect(await problem(await register('nobody', { nothing: 'valid' }))).toEqual(unknown)
    expect(await problem(await read('org-acme'))).toEqual(unknown)
  })

  it('answers 429 with Retry-After past the limit, says so in the log, and recovers after the window', async () => {
    const address = nextAddress()
    for (let i = 0; i < 10; i++) {
      expect((await register('acme', { name: 'Grace', email: `grace-${i}@example.com` }, address)).status).toBe(202)
    }

    clock.advance(90_000)
    const refused = await register('acme', { name: 'Grace', email: 'grace-10@example.com' }, address)

    expect(refused.status).toBe(429)
    expect(refused.headers.get('retry-after')).toBe('510')
    expect(apiProblemSchema.parse(await refused.json())).toMatchObject({ code: 'rate_limited', retryAfter: 510 })
    expect(await customersOf('org-acme')).toHaveLength(10)
    expect(lines.filter((line) => line.msg === 'rate limited')).toMatchObject([
      { level: 40, limit: 'public-write', retryAfterSeconds: 510 }
    ])
    expect((await register('acme', { name: 'Ada', phone: '555 0100' })).status).toBe(202)
    expect((await read('acme', address)).status).toBe(200)

    clock.advance(510_000)
    expect((await register('acme', { name: 'Grace', email: 'grace-10@example.com' }, address)).status).toBe(202)
    expect(await customersOf('org-acme')).toHaveLength(12)
  })

  it('limits reads too, misses included, so slugs cannot be probed faster', async () => {
    const address = nextAddress()
    for (let i = 0; i < 60; i++) await read(i % 2 === 0 ? 'acme' : `guess-${i}`, address)

    const refused = await read('acme', address)

    expect(refused.status).toBe(429)
    expect(refused.headers.get('retry-after')).toBe('60')
    expect((await read('nobody', address)).status).toBe(429)

    clock.advance(60_000)
    expect((await read('acme', address)).status).toBe(200)
  })

  it('is public to visitors, not to callers around the Worker, nor to pages of other sites', async () => {
    const direct = await fetch(`${url}/acme`, { headers: { 'X-Client-IP': nextAddress() } })
    const foreign = await fetch(`${url}/acme/customer-registrations`, {
      method: 'POST',
      headers: { ...worker(nextAddress()), Origin: 'https://evil.example', 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Grace', email: 'grace@example.com' })
    })

    expect(await problem(direct)).toMatchObject({ status: 403, code: 'proxy_required' })
    expect(await problem(foreign)).toMatchObject({ status: 403, code: 'origin_not_allowed' })
    expect(await customersOf('org-acme')).toEqual([])
  })
})
