import { createHash, createHmac } from 'node:crypto'
import type { Server } from 'node:http'
import type { AddressInfo } from 'node:net'
import { fileURLToPath } from 'node:url'
import { apiProblemSchema, identityOptionsSchema, meResponseSchema } from '@repo/contracts'
import { sql } from 'kysely'
import pino from 'pino'
import { inject } from 'vitest'
import { FixedClock } from '#libs/adapters/fixed-clock'
import { RecordingEmailSender } from '#libs/adapters/recording-email-sender'
import { createDatabase, createPool } from '#libs/database/database'
import { runMigrations } from '#libs/database/migrations'
import { emailTexts } from '#modules/identity/emails/email-texts'
import { createAuth } from '#modules/identity/infrastructure/auth'
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

const googleClient = { clientId: 'google-client', clientSecret: 'google-secret' }

/** An ID token as Google's token endpoint returns it; Better Auth reads it without the signature check. */
function googleIdToken(claims: Record<string, unknown>): string {
  const encode = (value: unknown) => Buffer.from(JSON.stringify(value)).toString('base64url')
  const now = Math.floor(Date.now() / 1000)
  const payload = {
    iss: 'https://accounts.google.com',
    aud: googleClient.clientId,
    iat: now,
    exp: now + 3600,
    ...claims
  }
  return `${encode({ alg: 'RS256', typ: 'JWT' })}.${encode(payload)}.signature`
}

/** The RFC 6238 code an authenticator app shows for `secret` (base32) right now. */
function totpCode(secret: string): string {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'
  const bits = [...secret.replace(/=+$/, '')]
    .map((char) => alphabet.indexOf(char).toString(2).padStart(5, '0'))
    .join('')
  const key = Buffer.from((bits.match(/.{8}/g) ?? []).map((byte) => Number.parseInt(byte, 2)))
  const counter = Buffer.alloc(8)
  counter.writeBigUInt64BE(BigInt(Math.floor(Date.now() / 30_000)))
  const hmac = createHmac('sha1', key).update(counter).digest()
  const offset = (hmac.at(-1) as number) & 0xf
  return ((hmac.readUInt32BE(offset) & 0x7fffffff) % 1_000_000).toString().padStart(6, '0')
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
  /** What Google says about the account that signs in, and the token requests it received. */
  let googleProfile: Record<string, unknown>
  const tokenRequests: string[] = []

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
      authSecret: 'fedcba9876543210'.repeat(2),
      google: googleClient
    })
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
    url = `http://127.0.0.1:${(server.address() as AddressInfo).port}`
  })

  /** A fresh client address: what came before in the test no longer counts against the rate limit. */
  const moveToAnotherAddress = () => {
    clientIp = `203.0.113.${++lastIp}`
  }

  beforeEach(() => {
    moveToAnotherAddress()
    breachCheckAnswers = true
    const realFetch = globalThis.fetch
    // The breach check calls out with `fetch`: answer it here and let every other call through.
    vi.stubGlobal('fetch', async (input: string | URL | Request, init?: RequestInit) => {
      const target = String(input)
      if (target === 'https://oauth2.googleapis.com/token') {
        tokenRequests.push(String(init?.body))
        return Response.json({ access_token: 'access', token_type: 'Bearer', id_token: googleIdToken(googleProfile) })
      }
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
  const post = (path: string, body: unknown, cookie = '') =>
    fetch(`${url}${path}`, {
      method: 'POST',
      headers: { Origin: webOrigin, 'X-Client-IP': clientIp, 'Content-Type': 'application/json', Cookie: cookie },
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

  /** Signs in and turns TOTP on, as the account security screen will. */
  async function enableTotp(address: string) {
    await signUpAndConfirm(address)
    const signedIn = cookieOf(await post('/api/auth/sign-in/email', { email: address, password }))
    const enabling = await post('/api/auth/two-factor/enable', { password }, signedIn)
    const { totpURI, backupCodes } = (await enabling.json()) as { totpURI: string; backupCodes: string[] }
    const secret = new URL(totpURI).searchParams.get('secret') ?? ''
    const confirmed = await post('/api/auth/two-factor/verify-totp', { code: totpCode(secret) }, signedIn)
    return { secret, backupCodes, cookie: cookieOf(confirmed) }
  }

  const userOf = async (cookie: string) =>
    ((await (await get('/api/auth/get-session', cookie)).json()) as { user: { twoFactorEnabled: boolean } } | null)
      ?.user

  /** Starts a Google sign-in as the web's button does: the page then goes to the returned URL. */
  async function startGoogle() {
    const started = await post('/api/auth/sign-in/social', { provider: 'google', callbackURL: '/' })
    return { authorize: new URL(((await started.json()) as { url: string }).url), cookie: cookieOf(started) }
  }

  /** Google sends the browser back with a code; Better Auth trades it for the profile in `googleProfile`. */
  async function finishGoogle(profile: Record<string, unknown>) {
    const { authorize, cookie } = await startGoogle()
    googleProfile = profile
    return get(`/api/auth/callback/google?code=google-code&state=${authorize.searchParams.get('state')}`, cookie)
  }

  /** Where a failed OAuth flow sends the browser, and the error code that page shows. */
  const errorPageOf = (response: Response) => {
    const location = new URL(response.headers.get('location') ?? '', webOrigin)
    return { page: `${location.origin}${location.pathname}`, error: location.searchParams.get('error') }
  }

  const providersOf = async (address: string) =>
    (
      await sql<{ providerId: string }>`
          select account."providerId" from auth.account join auth."user" on "user".id = account."userId"
          where "user".email = ${address} order by 1
        `.execute(db)
    ).rows.map((row) => row.providerId)

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

  it('turns TOTP on only after a first code from the app checks out (T13)', async () => {
    await signUpAndConfirm('uma@example.com')
    const cookie = cookieOf(await post('/api/auth/sign-in/email', { email: 'uma@example.com', password }))

    const enabling = await post('/api/auth/two-factor/enable', { password }, cookie)
    const { totpURI, backupCodes } = (await enabling.json()) as { totpURI: string; backupCodes: string[] }
    const pending = await userOf(cookie)
    const secret = new URL(totpURI).searchParams.get('secret') ?? ''
    const confirmed = await post('/api/auth/two-factor/verify-totp', { code: totpCode(secret) }, cookie)

    expect(totpURI).toMatch(/^otpauth:\/\/totp\//)
    expect(backupCodes).toHaveLength(10)
    expect(pending?.twoFactorEnabled).toBe(false)
    expect((await userOf(cookieOf(confirmed)))?.twoFactorEnabled).toBe(true)
  })

  it('asks for the second factor after the password, and signs in with a TOTP code (T13)', async () => {
    const { secret } = await enableTotp('vic@example.com')
    moveToAnotherAddress()

    const signIn = await post('/api/auth/sign-in/email', { email: 'vic@example.com', password })
    const challenge = cookieOf(signIn)
    const verified = await post('/api/auth/two-factor/verify-totp', { code: totpCode(secret) }, challenge)

    expect(await signIn.json()).toMatchObject({ twoFactorRedirect: true })
    expect(await userOf(challenge)).toBeUndefined()
    expect(verified.status).toBe(200)
    expect(await userOf(cookieOf(verified))).toMatchObject({ email: 'vic@example.com' })
  })

  it('accepts each backup code once (T13)', async () => {
    const { backupCodes } = await enableTotp('wes@example.com')
    moveToAnotherAddress()

    const first = await post('/api/auth/sign-in/email', { email: 'wes@example.com', password })
    const used = await post('/api/auth/two-factor/verify-backup-code', { code: backupCodes[0] }, cookieOf(first))
    const second = await post('/api/auth/sign-in/email', { email: 'wes@example.com', password })
    const reused = await post('/api/auth/two-factor/verify-backup-code', { code: backupCodes[0] }, cookieOf(second))

    expect(used.status).toBe(200)
    expect(reused.status).toBe(401)
    expect(await reused.json()).toMatchObject({ code: 'INVALID_BACKUP_CODE' })
  })

  it('allows 3 second-factor attempts per 10 seconds (T13)', async () => {
    await enableTotp('xia@example.com')
    moveToAnotherAddress()
    const challenge = cookieOf(await post('/api/auth/sign-in/email', { email: 'xia@example.com', password }))

    const attempt = () => post('/api/auth/two-factor/verify-totp', { code: '000000' }, challenge)
    const statuses = [(await attempt()).status, (await attempt()).status, (await attempt()).status]
    const fourth = await attempt()

    expect(statuses).toEqual([401, 401, 401])
    expect(fourth.status).toBe(429)
  })

  it('asks for the password to turn MFA off (T13)', async () => {
    const { cookie } = await enableTotp('yan@example.com')

    const wrong = await post('/api/auth/two-factor/disable', { password: `${password}!` }, cookie)
    const right = await post('/api/auth/two-factor/disable', { password }, cookie)

    expect(wrong.status).toBe(400)
    expect(await wrong.json()).toMatchObject({ code: 'INVALID_PASSWORD' })
    expect(right.status).toBe(200)
    expect((await userOf(cookieOf(right)))?.twoFactorEnabled).toBe(false)
  })

  it('keeps the TOTP secret encrypted at rest (T14)', async () => {
    const { secret } = await enableTotp('zoe@example.com')

    const { rows } = await sql<{ secret: string }>`
      select "twoFactor".secret from auth."twoFactor" join auth."user" on "user".id = "twoFactor"."userId"
      where "user".email = 'zoe@example.com'
    `.execute(db)

    expect(rows[0]?.secret).toBeDefined()
    expect(rows[0]?.secret).not.toContain(secret)
  })

  it('keeps Google off when it is not configured', async () => {
    const auth = createAuth({
      db,
      logger,
      emailSender: email,
      webOrigin,
      secret: 'fedcba9876543210'.repeat(2),
      google: undefined
    })

    const response = await auth.handler(
      new Request(`${webOrigin}/api/auth/sign-in/social`, {
        method: 'POST',
        headers: { Origin: webOrigin, 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider: 'google', callbackURL: '/' })
      })
    )

    expect(response.status).toBe(404)
  })

  it('sends the browser to Google with PKCE and the callback on the web origin', async () => {
    const { authorize } = await startGoogle()

    expect(`${authorize.origin}${authorize.pathname}`).toBe('https://accounts.google.com/o/oauth2/v2/auth')
    expect(authorize.searchParams.get('redirect_uri')).toBe(`${webOrigin}/api/auth/callback/google`)
    expect(authorize.searchParams.get('code_challenge_method')).toBe('S256')
    expect(authorize.searchParams.get('state')).toBeTruthy()
  })

  it('signs in a new user with the email Google confirmed', async () => {
    const callback = await finishGoogle({
      sub: 'google-amy',
      email: 'amy@example.com',
      email_verified: true,
      name: 'Amy'
    })

    expect(callback.status).toBe(302)
    expect(callback.headers.get('location')).toBe('/')
    expect(tokenRequests.at(-1)).toContain('code_verifier=')
    expect(await userOf(cookieOf(callback))).toMatchObject({ email: 'amy@example.com', emailVerified: true })
  })

  it('links Google to an account whose email is confirmed (T09)', async () => {
    await signUpAndConfirm('ben@example.com')

    const callback = await finishGoogle({
      sub: 'google-ben',
      email: 'ben@example.com',
      email_verified: true,
      name: 'Ben'
    })

    expect(callback.headers.get('location')).toBe('/')
    expect(await providersOf('ben@example.com')).toEqual(['credential', 'google'])
  })

  it('refuses to link Google to an account whose email is not confirmed yet (T09)', async () => {
    await signUp('cal@example.com')

    const callback = await finishGoogle({
      sub: 'google-cal',
      email: 'cal@example.com',
      email_verified: true,
      name: 'Cal'
    })

    expect(errorPageOf(callback)).toEqual({ page: `${webOrigin}/login`, error: 'account_not_linked' })
    expect(await providersOf('cal@example.com')).toEqual(['credential'])
  })

  it('refuses an email Google has not confirmed (T09)', async () => {
    const callback = await finishGoogle({
      sub: 'google-dee',
      email: 'dee@example.com',
      email_verified: false,
      name: 'Dee'
    })

    expect(errorPageOf(callback)).toEqual({ page: `${webOrigin}/login`, error: 'email_not_verified' })
    expect(await providersOf('dee@example.com')).toEqual([])
  })

  it('refuses a callback whose state it did not issue', async () => {
    const { cookie } = await startGoogle()

    const callback = await get('/api/auth/callback/google?code=google-code&state=forged', cookie)

    expect(errorPageOf(callback)).toEqual({ page: `${webOrigin}/login`, error: 'state_mismatch' })
  })

  it('tells the web that Google sign-in is on', async () => {
    const response = await get('/api/identity/options')

    expect(identityOptionsSchema.parse(await response.json())).toEqual({ google: true })
  })
})
