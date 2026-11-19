import type { Server } from 'node:http'
import type { AddressInfo } from 'node:net'
import { fileURLToPath } from 'node:url'
import { sql } from 'kysely'
import { inject } from 'vitest'
import { FakeBillingProvider } from '#libs/adapters/fake-billing-provider'
import { FixedClock } from '#libs/adapters/fixed-clock'
import { ManualTimer } from '#libs/adapters/manual-timer'
import { RecordingEmailSender } from '#libs/adapters/recording-email-sender'
import { UuidGenerator } from '#libs/adapters/uuid-generator'
import { createDatabase, createPool } from '#libs/database/database'
import { runMigrations } from '#libs/database/migrations'
import { memoryLogger } from '#libs/jobs/testing/memory-logger'
import { resetDatabase } from '../../test/reset-database'
import { createApp } from './create-app'
import { createJobs } from './create-jobs'

const webOrigin = 'http://localhost:5173'
const proxySecret = 'the-worker-secret'
const migrations = fileURLToPath(new URL('../../migrations/', import.meta.url))

/** The whole API on Postgres, as a browser reaches the report route: through the Worker, with no session (ADR 0072). */
describe('browser error reports on the database (ADR 0072)', () => {
  const memory = memoryLogger()
  const { lines } = memory
  // Production's logger tags every line with the release (ADR 0046).
  const logger = memory.logger.child({ release: 'api-test' })
  const db = createDatabase(createPool(inject('databaseUrl'), logger))
  const clock = new FixedClock(new Date('2026-11-12T10:00:00.000Z'))
  const billing = new FakeBillingProvider({ clock, ids: new UuidGenerator(), token: undefined })
  const jobs = createJobs({
    billing,
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
    server = createApp({
      clock,
      logger,
      serviceName: 'api',
      release: 'api-test',
      webOrigin,
      corsOrigins: [],
      proxySecret,
      db,
      jobs: jobs.queue,
      jobsOn: jobs.bind,
      authSecret: 'fedcba9876543210'.repeat(2),
      google: undefined,
      billing
    })
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
    url = `http://127.0.0.1:${(server.address() as AddressInfo).port}/api/client-errors`
  })

  beforeEach(async () => {
    await sql`truncate rate_limit`.execute(db)
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

  const report = {
    kind: 'unhandledrejection',
    message: 'Failed to fetch dynamically imported module',
    route: '/:organizationSlug/customers',
    release: 'web-3e75fa2',
    reference: 'a1b2c3d4e5f6'
  }

  const send = (body: unknown, address = nextAddress(), headers: Record<string, string> = {}) =>
    fetch(url, {
      method: 'POST',
      headers: { ...worker(address), Origin: webOrigin, 'Content-Type': 'application/json', ...headers },
      body: JSON.stringify(body)
    })

  it('logs one line with both releases and writes nothing to the database but the limiter counter', async () => {
    const response = await send(report)

    expect(response.status).toBe(204)
    expect(lines.filter((line) => line.msg === 'client error')).toEqual([
      expect.objectContaining({ release: 'api-test', clientRelease: 'web-3e75fa2', reference: 'a1b2c3d4e5f6' })
    ])
    expect((await sql<{ count: string }>`select count(*) from rate_limit`.execute(db)).rows[0]?.count).toBe('1')
  })

  it('counts every address on Postgres: the 31st report of one address is refused, another still passes', async () => {
    const address = nextAddress()
    for (let sent = 0; sent < 30; sent++) expect((await send(report, address)).status).toBe(204)

    expect((await send(report, address)).status).toBe(429)
    expect((await send(report)).status).toBe(204)
  })

  it('refuses a call that skips the Worker, and a report sent from another site', async () => {
    const direct = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Origin: webOrigin },
      body: JSON.stringify(report)
    })
    const foreign = await send(report, nextAddress(), { Origin: 'https://evil.example' })

    expect(direct.status).toBe(403)
    expect(foreign.status).toBe(403)
    expect(lines.filter((line) => line.msg === 'client error')).toEqual([])
  })
})
