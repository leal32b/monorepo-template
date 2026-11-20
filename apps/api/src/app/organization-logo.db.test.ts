import { mkdtemp } from 'node:fs/promises'
import type { Server } from 'node:http'
import type { AddressInfo } from 'node:net'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { organizationLogoSchema, organizationMembershipSchema, signedUploadSchema } from '@repo/contracts'
import { sql } from 'kysely'
import pino from 'pino'
import { inject } from 'vitest'
import { FakeBillingProvider } from '#libs/adapters/fake-billing-provider'
import { FixedClock } from '#libs/adapters/fixed-clock'
import { LocalFileStorage } from '#libs/adapters/local-file-storage'
import { ManualTimer } from '#libs/adapters/manual-timer'
import { RecordingEmailSender } from '#libs/adapters/recording-email-sender'
import { UuidGenerator } from '#libs/adapters/uuid-generator'
import { createDatabase, createPool } from '#libs/database/database'
import { runMigrations } from '#libs/database/migrations'
import { png } from '#modules/organization-logo/testing/organization-logo-kit'
import { resetDatabase } from '../../test/reset-database'
import { createApp } from './create-app'
import { createJobs } from './create-jobs'

const webOrigin = 'http://localhost:5173'
const migrations = fileURLToPath(new URL('../../migrations/', import.meta.url))
const password = 'correct horse battery staple'

/**
 * The whole API on Postgres and the local store, as `pnpm dev` runs it (ADR 0076): an owner signs an upload,
 * sends the file to the address, confirms it, and the membership read carries the logo.
 */
describe('the organization logo on the database and the local store (ADR 0076)', () => {
  const logger = pino({ level: 'silent' })
  const db = createDatabase(createPool(inject('databaseUrl'), logger))
  const clock = new FixedClock(new Date('2026-11-20T12:00:00.000Z'))
  const billing = new FakeBillingProvider({ clock, ids: new UuidGenerator(), token: undefined })
  const email = new RecordingEmailSender()
  let storage: LocalFileStorage
  let jobs: ReturnType<typeof createJobs>
  let server: Server
  let url: string
  let lastIp = 0
  let lastAccount = 0

  beforeAll(async () => {
    await resetDatabase(db)
    await runMigrations(db, migrations)
    storage = new LocalFileStorage({ root: await mkdtemp(path.join(tmpdir(), 'logo-')), secret: 's'.repeat(32), clock })
    jobs = createJobs({
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
  const call = (method: string, address: string, cookie: string, body?: unknown) =>
    fetch(`${url}${address}`, {
      method,
      headers: { Origin: webOrigin, 'X-Client-IP': nextIp(), 'Content-Type': 'application/json', Cookie: cookie },
      body: body === undefined ? null : JSON.stringify(body)
    })
  const cookieOf = (response: Response) =>
    response.headers
      .getSetCookie()
      .map((cookie) => cookie.split(';')[0])
      .join('; ')

  /** A confirmed account, signed in. */
  async function account() {
    const address = `logo-${++lastAccount}@example.com`
    await call('POST', '/api/auth/sign-up/email', '', { name: `Person ${lastAccount}`, email: address, password })
    await jobs.worker.drain()
    const sent = email.sent.filter((message) => message.to === address).at(-1)
    const link = new URL((sent?.text.match(/https?:\/\/\S+/) ?? [''])[0])
    await call('GET', link.pathname + link.search, '')
    const signedIn = await call('POST', '/api/auth/sign-in/email', '', { email: address, password })
    const { user } = (await signedIn.clone().json()) as { user: { id: string } }
    return { id: user.id, cookie: cookieOf(signedIn) }
  }

  async function organization() {
    const owner = await account()
    const created = await call('POST', '/api/auth/organization/create', owner.cookie, {
      name: 'Acme',
      slug: `acme-${lastAccount}`,
      timeZone: 'America/Sao_Paulo',
      currency: 'BRL'
    })
    const { id } = (await created.json()) as { id: string }
    return { owner, id, base: `/api/organizations/${id}/logo` }
  }

  /** What the browser does: sign, `PUT` the file to the address, confirm. */
  async function upload(base: string, cookie: string, file: Buffer, type = 'image/png') {
    const signed = await call('POST', `${base}/uploads`, cookie, { type, size: file.length })
    expect(signed.status).toBe(201)
    const { uploadId, url: address, headers } = signedUploadSchema.parse(await signed.json())
    const put = await fetch(`${url}${address}`, {
      method: 'PUT',
      headers: { ...headers, Origin: webOrigin },
      body: file
    })
    expect(put.status).toBe(200)
    return call('PUT', base, cookie, { uploadId })
  }

  const membership = async (id: string, cookie: string) =>
    organizationMembershipSchema.parse(await (await call('GET', `/api/organizations/${id}/me`, cookie)).json())

  it('uploads a logo, which the membership carries and its address serves, then replaces and removes it', async () => {
    const { owner, id, base } = await organization()
    expect((await membership(id, owner.cookie)).logo).toBeNull()

    const changed = await upload(base, owner.cookie, png(256, 128))
    expect(changed.status).toBe(200)
    const logo = organizationLogoSchema.parse(await changed.json())
    expect(logo).toMatchObject({ width: 256, height: 128 })
    expect((await membership(id, owner.cookie)).logo).toEqual(logo)
    const image = await fetch(`${url}${logo.url}`)
    expect(image.headers.get('content-type')).toBe('image/png')
    expect(image.headers.get('cache-control')).toBe('private, max-age=86400, immutable')

    const replaced = organizationLogoSchema.parse(await (await upload(base, owner.cookie, png(512, 512))).json())
    expect(replaced.url).not.toBe(logo.url)
    await jobs.worker.drain()
    expect((await fetch(`${url}${logo.url}`)).status).toBe(404)
    expect(await storage.deletePrefix(`uploads/${id}/`)).toBe(0)

    expect((await call('DELETE', base, owner.cookie)).status).toBe(204)
    await jobs.worker.drain()
    expect((await membership(id, owner.cookie)).logo).toBeNull()
    expect((await fetch(`${url}${replaced.url}`)).status).toBe(404)
    const { rows } = await sql<{ action: string }>`
      select action from audit_entry where organization_id = ${id} order by at, action`.execute(db)
    expect(rows.map((row) => row.action)).toEqual(['logo-changed', 'logo-changed', 'logo-removed'])
  })

  it('refuses a file that is not what it says, with the reason the page shows (T63)', async () => {
    const { owner, base } = await organization()

    const svg = await upload(base, owner.cookie, Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"/>'))
    const small = await upload(base, owner.cookie, png(32, 32))
    const big = await call('POST', `${base}/uploads`, owner.cookie, { type: 'image/png', size: 1_048_577 })
    const missing = await call('PUT', base, owner.cookie, { uploadId: '00000000-0000-4000-8000-000000000000' })

    expect(
      await Promise.all(
        [svg, small, big, missing].map(async (r) => [r.status, ((await r.json()) as { code: string }).code])
      )
    ).toEqual([
      [400, 'logo_type_unsupported'],
      [400, 'logo_dimensions'],
      [400, 'validation_failed'],
      [409, 'logo_upload_missing']
    ])
  })

  it('lets owners and admins change the logo, not a member, nor another organization’s owner (T62)', async () => {
    const { owner, id, base } = await organization()
    const member = await account()
    await sql`insert into auth.member (id, "organizationId", "userId", role, "createdAt")
      values (${`m-${member.id}`}, ${id}, ${member.id}, 'member', now())`.execute(db)
    const stranger = await organization()

    expect((await call('POST', `${base}/uploads`, member.cookie, { type: 'image/png', size: 10 })).status).toBe(403)
    expect((await call('DELETE', base, stranger.owner.cookie)).status).toBe(404)
    const signed = signedUploadSchema.parse(
      await (await call('POST', `${base}/uploads`, owner.cookie, { type: 'image/png', size: 33 })).json()
    )
    await fetch(`${url}${signed.url}`, {
      method: 'PUT',
      headers: { ...signed.headers, Origin: webOrigin },
      body: png(64, 64)
    })
    const elsewhere = await call('PUT', stranger.base, stranger.owner.cookie, { uploadId: signed.uploadId })
    expect(((await elsewhere.json()) as { code: string }).code).toBe('logo_upload_missing')
  })

  it('deletes every file of an organization when it is deleted (T65)', async () => {
    const { owner, id, base } = await organization()
    await upload(base, owner.cookie, png(64, 64))
    await jobs.worker.drain()

    const deleted = await call('POST', '/api/auth/organization/delete', owner.cookie, { organizationId: id })
    expect(deleted.status).toBe(200)
    await jobs.worker.drain()

    expect(await storage.deletePrefix(`logos/${id}/`)).toBe(0)
  })
})
