import { createHash } from 'node:crypto'
import type { Server } from 'node:http'
import type { AddressInfo } from 'node:net'
import { fileURLToPath } from 'node:url'
import { apiProblemSchema, meResponseSchema } from '@repo/contracts'
import { sql } from 'kysely'
import pino from 'pino'
import { inject } from 'vitest'
import { FixedClock } from '#libs/adapters/fixed-clock'
import { RecordingEmailSender } from '#libs/adapters/recording-email-sender'
import { createDatabase, createPool } from '#libs/database/database'
import { runMigrations } from '#libs/database/migrations'
import { emailTexts } from '#modules/identity/emails/email-texts'
import { createApp } from './create-app'

const webOrigin = 'http://localhost:5173'
const migrations = fileURLToPath(new URL('../../migrations/', import.meta.url))
const password = 'correct horse battery staple'
const breachedPassword = 'password password password'
const newPassword = 'a brand new long passphrase'

/** Have I Been Pwned's range API: the suffixes of the breached SHA-1 hashes that share `prefix`. */
function pwnedRange(prefix: string): string {
  const hash = createHash('sha1').update(breachedPassword).digest('hex').toUpperCase()
  return hash.startsWith(prefix) ? `${hash.slice(5)}:3` : ''
}

describe('authentication through Better Auth (ADR 0020)', () => {
  const logger = pino({ level: 'silent' })
  const db = createDatabase(createPool(inject('databaseUrl'), logger))
  const email = new RecordingEmailSender()
  let server: Server
  let url: string
  /** Each test comes from its own address, as the Worker reports it (ADR 0022). */
  let clientIp: string
  let lastIp = 0
  let breachCheckAnswers: boolean

  beforeAll(async () => {
    // Better Auth checks its tables when the app is built, so the app comes after the migrations.
    await sql.raw('drop schema if exists auth cascade; drop table if exists schema_migration').execute(db)
    await runMigrations(db, migrations)
    server = createApp({
      clock: new FixedClock(new Date('2026-10-29T12:00:00.000Z')),
      logger,
      serviceName: 'api',
      webOrigin,
      corsOrigins: [],
      proxySecret: undefined,
      db,
      emailSender: email,
      authSecret: 'fedcba9876543210'.repeat(2)
    })
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
    url = `http://127.0.0.1:${(server.address() as AddressInfo).port}`
  })

  beforeEach(() => {
    clientIp = `203.0.113.${++lastIp}`
    breachCheckAnswers = true
    const realFetch = globalThis.fetch
    // The breach check calls out with `fetch`: answer it here and let every other call through.
    vi.stubGlobal('fetch', async (input: string | URL | Request, init?: RequestInit) => {
      const target = String(input)
      if (!target.startsWith('https://api.pwnedpasswords.com/range/')) return realFetch(input, init)
      return breachCheckAnswers ? new Response(pwnedRange(target.slice(-5))) : new Response(null, { status: 503 })
    })
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  afterAll(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()))
    await db.destroy()
  })

  /** A write from the web app's page. */
  const post = (path: string, body: unknown) =>
    fetch(`${url}${path}`, {
      method: 'POST',
      headers: { Origin: webOrigin, 'X-Client-IP': clientIp, 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    })

  const get = (path: string, cookie = '') =>
    fetch(`${url}${path}`, { headers: { 'X-Client-IP': clientIp, Cookie: cookie }, redirect: 'manual' })

  /** The cookies a response sets, as a `Cookie` header. */
  const cookieOf = (response: Response) =>
    response.headers
      .getSetCookie()
      .map((cookie) => cookie.split(';')[0])
      .join('; ')

  /** Path and query of the link in the last email to `to`: the browser follows it through the Worker. */
  const linkTo = (to: string) => {
    const link = email.sent.findLast((message) => message.to === to)?.text.match(/https?:\/\/\S+/)?.[0]
    if (link === undefined) throw new Error(`No link was emailed to ${to}`)
    const { pathname, search } = new URL(link)
    return pathname + search
  }

  const signUp = (address: string, locale = 'en') =>
    post('/api/auth/sign-up/email', { name: 'Ada', email: address, password, locale })

  async function signUpAndConfirm(address: string, locale = 'en') {
    await signUp(address, locale)
    await get(linkTo(address))
  }

  const requestReset = (address: string) =>
    post('/api/auth/request-password-reset', { email: address, redirectTo: '/reset-password' })

  /** The page the reset link sends the browser to, with the token in its query. */
  async function resetPage(address: string) {
    const visit = await get(linkTo(address))
    return new URL(visit.headers.get('location') ?? '', webOrigin)
  }

  it("signs up and sends the confirmation link in the user's language", async () => {
    const response = await signUp('ada@example.com', 'pt-BR')

    expect(response.status).toBe(200)
    expect(email.sent.at(-1)).toMatchObject({
      to: 'ada@example.com',
      subject: emailTexts['pt-BR'].confirmEmail.subject
    })
    expect(email.sent.at(-1)?.text).toContain(`${webOrigin}/api/auth/verify-email?token=`)
  })

  it('refuses to sign in before the email is confirmed', async () => {
    await signUp('bob@example.com')

    const response = await post('/api/auth/sign-in/email', { email: 'bob@example.com', password })

    expect(response.status).toBe(403)
    expect(await response.json()).toMatchObject({ code: 'EMAIL_NOT_VERIFIED' })
  })

  it('confirms the email with the link and signs the user in', async () => {
    await signUp('cleo@example.com')

    const confirmed = await get(linkTo('cleo@example.com'))
    const session = await get('/api/auth/get-session', cookieOf(confirmed))

    expect(confirmed.status).toBe(302)
    expect(await session.json()).toMatchObject({ user: { email: 'cleo@example.com', emailVerified: true } })
  })

  it('signs in with the password once the email is confirmed', async () => {
    await signUpAndConfirm('dan@example.com')

    const response = await post('/api/auth/sign-in/email', { email: 'dan@example.com', password })
    const session = await get('/api/auth/get-session', cookieOf(response))

    expect(response.status).toBe(200)
    expect(await session.json()).toMatchObject({ user: { email: 'dan@example.com' } })
  })

  it('refuses a wrong password', async () => {
    await signUpAndConfirm('erin@example.com')

    const response = await post('/api/auth/sign-in/email', { email: 'erin@example.com', password: `${password}!` })

    expect(response.status).toBe(401)
    expect(await response.json()).toMatchObject({ code: 'INVALID_EMAIL_OR_PASSWORD' })
  })

  it('keeps the password as an Argon2id hash', async () => {
    await signUp('finn@example.com')

    const { rows } = await sql<{ password: string }>`
      select account.password from auth.account join auth."user" on "user".id = account."userId"
      where "user".email = 'finn@example.com'
    `.execute(db)

    expect(rows[0]?.password).toMatch(/^\$argon2id\$/)
  })

  it('logs an email that could not be sent, and keeps the sign-up', async () => {
    vi.spyOn(email, 'send').mockRejectedValueOnce(new Error('provider down'))
    const error = vi.spyOn(logger, 'error')

    const response = await signUp('gus@example.com')

    expect(response.status).toBe(200)
    await vi.waitFor(() =>
      expect(error).toHaveBeenCalledWith(expect.objectContaining({ kind: 'confirmEmail' }), 'email not sent')
    )
  })

  it('answers a sign-up for a taken email as for a new one, and tells the owner (T08)', async () => {
    const fields = async (response: Response) => Object.keys(((await response.json()) as { user: object }).user).sort()

    const first = await signUp('hana@example.com', 'pt-BR')
    const again = await signUp('hana@example.com')

    expect(again.status).toBe(first.status)
    expect(await fields(again)).toEqual(await fields(first))
    expect(email.sent.at(-1)).toMatchObject({
      to: 'hana@example.com',
      subject: emailTexts['pt-BR'].alreadyRegistered.subject
    })
    expect(email.sent.at(-1)?.text).toContain(`${webOrigin}/login`)
  })

  it('refuses a password found in breaches', async () => {
    const response = await post('/api/auth/sign-up/email', {
      name: 'Ivy',
      email: 'ivy@example.com',
      password: breachedPassword,
      locale: 'en'
    })

    expect(response.status).toBe(400)
    expect(await response.json()).toMatchObject({ code: 'PASSWORD_COMPROMISED' })
  })

  it('refuses the sign-up while the breach check cannot be reached', async () => {
    breachCheckAnswers = false

    const response = await signUp('jay@example.com')

    expect(response.status).toBe(500)
    expect(email.sent.some((message) => message.to === 'jay@example.com')).toBe(false)
  })

  it.each([
    ['shorter than 15 characters', 'x'.repeat(14), 'PASSWORD_TOO_SHORT'],
    ['longer than 128 characters', 'x'.repeat(129), 'PASSWORD_TOO_LONG']
  ])('refuses a password %s', async (_case, tooBad, code) => {
    const response = await post('/api/auth/sign-up/email', {
      name: 'Kim',
      email: 'kim@example.com',
      password: tooBad,
      locale: 'en'
    })

    expect(response.status).toBe(400)
    expect(await response.json()).toMatchObject({ code })
  })

  it('refuses a language it writes no email in', async () => {
    const response = await signUp('lee@example.com', 'fr')

    expect(response.status).toBe(400)
    expect(await response.json()).toMatchObject({ code: 'VALIDATION_ERROR' })
  })

  it('limits sign-in attempts per client address, counted in the database (T01, T02)', async () => {
    const attempt = () => post('/api/auth/sign-in/email', { email: 'max@example.com', password })

    const statuses = [(await attempt()).status, (await attempt()).status, (await attempt()).status]
    const fourth = await attempt()
    clientIp = '198.51.100.1'
    const elsewhere = await attempt()

    expect(statuses).toEqual([401, 401, 401])
    expect(fourth.status).toBe(429)
    expect(elsewhere.status).toBe(401)
    const { rows } = await sql<{ key: string }>`select key from auth."rateLimit"`.execute(db)
    expect(rows.map((row) => row.key)).toContain(`203.0.113.${lastIp}|/sign-in/email`)
  })

  it("emails a reset link in the user's language, and answers alike for an unknown address (T08)", async () => {
    await signUpAndConfirm('nina@example.com', 'pt-BR')

    const known = await requestReset('nina@example.com')
    const unknown = await requestReset('nobody@example.com')

    expect(known.status).toBe(200)
    expect(await unknown.json()).toEqual(await known.json())
    expect(email.sent.at(-1)).toMatchObject({
      to: 'nina@example.com',
      subject: emailTexts['pt-BR'].resetPassword.subject
    })
    expect(email.sent.some((message) => message.to === 'nobody@example.com')).toBe(false)
  })

  it('sets a new password through the link and ends every session (T10)', async () => {
    await signUpAndConfirm('omar@example.com')
    const before = cookieOf(await post('/api/auth/sign-in/email', { email: 'omar@example.com', password }))
    await requestReset('omar@example.com')

    const page = await resetPage('omar@example.com')
    const reset = await post('/api/auth/reset-password', { token: page.searchParams.get('token'), newPassword })

    expect(`${page.origin}${page.pathname}`).toBe(`${webOrigin}/reset-password`)
    expect(reset.status).toBe(200)
    expect(await (await get('/api/auth/get-session', before)).json()).toBeNull()
    expect((await post('/api/auth/sign-in/email', { email: 'omar@example.com', password })).status).toBe(401)
    expect((await post('/api/auth/sign-in/email', { email: 'omar@example.com', password: newPassword })).status).toBe(
      200
    )
  })

  it('accepts each reset link once (T10)', async () => {
    await signUpAndConfirm('pia@example.com')
    await requestReset('pia@example.com')
    const token = (await resetPage('pia@example.com')).searchParams.get('token')

    await post('/api/auth/reset-password', { token, newPassword })
    const again = await post('/api/auth/reset-password', { token, newPassword: `${newPassword}!` })

    expect(again.status).toBe(400)
    expect(await again.json()).toMatchObject({ code: 'INVALID_TOKEN' })
  })

  it('refuses a reset link older than one hour, as the email says (T10)', async () => {
    await signUpAndConfirm('quinn@example.com')
    await requestReset('quinn@example.com')
    const token = (await resetPage('quinn@example.com')).searchParams.get('token')

    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(Date.now() + 61 * 60 * 1000)
    const late = await post('/api/auth/reset-password', { token, newPassword })

    expect(late.status).toBe(400)
    expect(await late.json()).toMatchObject({ code: 'INVALID_TOKEN' })
  })

  it('refuses a new password found in breaches', async () => {
    await signUpAndConfirm('rosa@example.com')
    await requestReset('rosa@example.com')
    const token = (await resetPage('rosa@example.com')).searchParams.get('token')

    const reset = await post('/api/auth/reset-password', { token, newPassword: breachedPassword })

    expect(reset.status).toBe(400)
    expect(await reset.json()).toMatchObject({ code: 'PASSWORD_COMPROMISED' })
  })

  it('answers GET /api/me with the signed-in user', async () => {
    await signUpAndConfirm('sam@example.com')
    const cookie = cookieOf(await post('/api/auth/sign-in/email', { email: 'sam@example.com', password }))

    const response = await get('/api/me', cookie)

    expect(response.status).toBe(200)
    expect(meResponseSchema.parse(await response.json())).toMatchObject({ email: 'sam@example.com', name: 'Ada' })
  })

  it('answers GET /api/me with a 401 when nobody is signed in', async () => {
    const response = await get('/api/me')

    expect(response.status).toBe(401)
    expect(apiProblemSchema.parse(await response.json()).code).toBe('unauthenticated')
  })

  it('reads the session without refreshing it, so a GET never writes (ADR 0020)', async () => {
    await signUpAndConfirm('tess@example.com')
    const cookie = cookieOf(await post('/api/auth/sign-in/email', { email: 'tess@example.com', password }))
    const expiries = async () =>
      (
        await sql<{ expiresAt: Date }>`
          select session."expiresAt" from auth.session join auth."user" on "user".id = session."userId"
          where "user".email = 'tess@example.com'
        `.execute(db)
      ).rows.map((row) => row.expiresAt.toISOString())
    const before = await expiries()

    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(Date.now() + 2 * 24 * 60 * 60 * 1000) // past the daily refresh
    const response = await get('/api/me', cookie)

    expect(response.status).toBe(200)
    expect(await expiries()).toEqual(before)
  })
})
