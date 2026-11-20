import type { Server } from 'node:http'
import type { AddressInfo } from 'node:net'
import { fileURLToPath } from 'node:url'
import { inflateRawSync } from 'node:zlib'
import { organizationExportSchema } from '@repo/contracts'
import { sql } from 'kysely'
import { inject } from 'vitest'
import { FakeBillingProvider } from '#libs/adapters/fake-billing-provider'
import { FixedClock } from '#libs/adapters/fixed-clock'
import { InMemoryFileStorage } from '#libs/adapters/in-memory-file-storage'
import { ManualTimer } from '#libs/adapters/manual-timer'
import { RecordingEmailSender } from '#libs/adapters/recording-email-sender'
import { UuidGenerator } from '#libs/adapters/uuid-generator'
import { createDatabase, createPool } from '#libs/database/database'
import { runMigrations } from '#libs/database/migrations'
import { memoryLogger } from '#libs/jobs/testing/memory-logger'
import { resetDatabase } from '../../test/reset-database'
import { createApp } from './create-app'
import { createJobs } from './create-jobs'

/** The file store of the run (ADR 0076): the jobs and the app share it. */
const storage = new InMemoryFileStorage()

const webOrigin = 'http://localhost:5173'
const migrations = fileURLToPath(new URL('../../migrations/', import.meta.url))
const password = 'correct horse battery staple'

/** The files of a zip by name, read by its central directory. */
function unzip(archive: Buffer): Record<string, string> {
  const end = archive.lastIndexOf(Buffer.from([0x50, 0x4b, 0x05, 0x06]))
  let at = archive.readUInt32LE(end + 16)
  const files: Record<string, string> = {}
  for (let index = 0; index < archive.readUInt16LE(end + 10); index++) {
    const size = archive.readUInt32LE(at + 20)
    const nameLength = archive.readUInt16LE(at + 28)
    const offset = archive.readUInt32LE(at + 42)
    const data = offset + 30 + archive.readUInt16LE(offset + 26)
    files[archive.subarray(at + 46, at + 46 + nameLength).toString()] = inflateRawSync(
      archive.subarray(data, data + size)
    ).toString()
    at += 46 + nameLength
  }
  return files
}

/** The whole API on Postgres: an owner asks, the job builds, the email tells, the owner downloads (ADR 0074). */
describe('the organization export on the database (ADR 0074)', () => {
  const { logger, lines } = memoryLogger()
  const db = createDatabase(createPool(inject('databaseUrl'), logger))
  const clock = new FixedClock(new Date('2026-11-19T12:00:00.000Z'))
  const billing = new FakeBillingProvider({ clock, ids: new UuidGenerator(), token: undefined })
  const email = new RecordingEmailSender()
  const jobs = createJobs({
    storage,
    webOrigin,
    billing,
    db,
    clock,
    logger,
    emailSender: email,
    timer: new ManualTimer(clock),
    idlePollMs: 3_600_000
  })
  let server: Server
  let url: string
  let lastIp = 0
  let lastAccount = 0

  beforeAll(async () => {
    await resetDatabase(db)
    await runMigrations(db, migrations)
    server = createApp({
      storage,
      clock,
      logger,
      serviceName: 'api',
      release: 'test',
      webOrigin,
      corsOrigins: [],
      proxySecret: undefined,
      db,
      jobs: jobs.queue,
      jobsOn: jobs.bind,
      authSecret: 'fedcba9876543210'.repeat(2),
      google: undefined,
      billing
    })
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
    url = `http://127.0.0.1:${(server.address() as AddressInfo).port}`
  })

  beforeEach(() => {
    const realFetch = globalThis.fetch
    vi.stubGlobal('fetch', async (input: string | URL | Request, init?: RequestInit) =>
      String(input).startsWith('https://api.pwnedpasswords.com/range/') ? new Response('') : realFetch(input, init)
    )
  })

  afterAll(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()))
    await db.destroy()
  })

  const nextIp = () => `192.0.2.${++lastIp % 250}`
  const call = (method: string, path: string, cookie: string, body?: unknown) =>
    fetch(`${url}${path}`, {
      method,
      headers: { Origin: webOrigin, 'X-Client-IP': nextIp(), 'Content-Type': 'application/json', Cookie: cookie },
      body: body === undefined ? null : JSON.stringify(body)
    })
  const cookieOf = (response: Response) =>
    response.headers
      .getSetCookie()
      .map((cookie) => cookie.split(';')[0])
      .join('; ')
  const sentTo = async (to: string) => {
    await jobs.worker.drain()
    return email.sent.filter((message) => message.to === to)
  }

  /** A confirmed account, signed in, in `locale`. */
  async function account(locale = 'en') {
    const address = `exporter-${++lastAccount}@example.com`
    await call('POST', '/api/auth/sign-up/email', '', {
      name: `Person ${lastAccount}`,
      email: address,
      password,
      locale
    })
    const link = new URL(((await sentTo(address)).at(-1)?.text.match(/https?:\/\/\S+/) ?? [''])[0])
    await call('GET', link.pathname + link.search, '')
    const signedIn = await call('POST', '/api/auth/sign-in/email', '', { email: address, password })
    const { user } = (await signedIn.clone().json()) as { user: { id: string } }
    return { id: user.id, email: address, cookie: cookieOf(signedIn) }
  }

  async function acme() {
    const owner = await account('pt-BR')
    const created = await call('POST', '/api/auth/organization/create', owner.cookie, {
      name: 'Acme',
      slug: `acme-${lastAccount}`,
      timeZone: 'America/Sao_Paulo',
      currency: 'BRL'
    })
    const { id } = (await created.json()) as { id: string }
    await sql`insert into customer (id, organization_id, name, created_at, updated_at, version)
      values (${`c-${id}`}, ${id}, 'Grace Hopper', now(), now(), 1)`.execute(db)
    return { owner, id, base: `/api/organizations/${id}/export` }
  }

  it('answers none, then pending on a request, then ready once the job built it, with an email to the owner', async () => {
    const { owner, base } = await acme()
    expect(await (await call('GET', base, owner.cookie)).json()).toEqual({ status: 'none' })

    const requested = await call('POST', base, owner.cookie)
    expect(requested.status).toBe(202)
    expect(organizationExportSchema.parse(await requested.json())).toMatchObject({ status: 'pending' })

    const [message] = await sentTo(owner.email).then((all) =>
      all.filter((sent) => sent.subject.startsWith('A exportação'))
    )
    expect(message?.text).toContain(`${webOrigin}/acme-${lastAccount}/settings/general`)
    const state = organizationExportSchema.parse(await (await call('GET', base, owner.cookie)).json())
    expect(state).toMatchObject({ status: 'ready', expiresAt: '2026-11-26T12:00:00.000Z' })
  })

  it("downloads the organization's data from the store, as a zip of CSV files, and logs who took it (ADR 0076)", async () => {
    const { owner, id, base } = await acme()
    await call('POST', base, owner.cookie)
    await jobs.worker.drain()

    const response = await fetch(`${url}${base}/file`, { headers: { Cookie: owner.cookie }, redirect: 'manual' })

    expect(response.status).toBe(302)
    expect(response.headers.get('cache-control')).toBe('no-store')
    // The in-memory store's address: `memory://<key>?…`, what it grants in the query.
    const [key, query] = (response.headers.get('location') as string).slice('memory://'.length).split('?')
    expect(key).toMatch(new RegExp(`^exports/${id}/[\\w-]+\\.zip$`))
    expect(new URLSearchParams(query).get('name')).toBe('organization-export-2026-11-19.zip')
    expect(new URLSearchParams(query).get('expires')).toBe('300')
    const files = unzip(storage.files.get(key as string)?.content as Buffer)
    expect(Object.keys(files)).toEqual([
      'organization.csv',
      'members.csv',
      'invitations.csv',
      'roles.csv',
      'customers.csv',
      'activity.csv',
      'subscription.csv'
    ])
    expect(files['customers.csv']).toContain('Grace Hopper')
    expect(files['members.csv']).toContain(owner.email)
    expect(files['activity.csv']).toContain('export-requested')
    expect(lines).toContainEqual(
      expect.objectContaining({ msg: 'export downloaded', organizationId: id, actorId: owner.id })
    )
  })

  it('refuses a second request within 15 minutes, a download before it is ready, and an admin (T57, T59)', async () => {
    const { owner, id, base } = await acme()
    expect((await call('GET', `${base}/file`, owner.cookie)).status).toBe(404)
    await call('POST', base, owner.cookie)
    const again = await call('POST', base, owner.cookie)
    expect([again.status, ((await again.json()) as { code: string }).code]).toEqual([409, 'export_too_soon'])

    const admin = await account()
    await sql`insert into auth.member (id, "organizationId", "userId", role, "createdAt")
      values (${`m-${admin.id}`}, ${id}, ${admin.id}, 'admin', now())`.execute(db)
    expect((await call('GET', base, admin.cookie)).status).toBe(403)
    expect((await call('GET', `${base}/file`, admin.cookie)).status).toBe(403)
  })
})
