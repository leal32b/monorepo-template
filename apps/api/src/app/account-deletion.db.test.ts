import type { Server } from 'node:http'
import type { AddressInfo } from 'node:net'
import { fileURLToPath } from 'node:url'
import { accountDeletionSchema } from '@repo/contracts'
import { sql } from 'kysely'
import pino from 'pino'
import { inject } from 'vitest'
import { FixedClock } from '#libs/adapters/fixed-clock'
import { RecordingEmailSender } from '#libs/adapters/recording-email-sender'
import { createDatabase, createPool } from '#libs/database/database'
import { runMigrations } from '#libs/database/migrations'
import { resetDatabase } from '../../test/reset-database'
import { createApp } from './create-app'

const webOrigin = 'http://localhost:5173'
const migrations = fileURLToPath(new URL('../../migrations/', import.meta.url))
const password = 'correct horse battery staple'

type Person = { id: string; email: string; cookie: string }

describe('account deletion through Better Auth (ADR 0049)', () => {
  const logger = pino({ level: 'silent' })
  const db = createDatabase(createPool(inject('databaseUrl'), logger))
  const email = new RecordingEmailSender()
  let server: Server
  let url: string
  let lastIp = 0
  let lastAccount = 0

  beforeAll(async () => {
    await resetDatabase(db)
    await runMigrations(db, migrations)
    server = createApp({
      clock: new FixedClock(new Date('2026-11-08T12:00:00.000Z')),
      logger,
      serviceName: 'api',
      release: 'test',
      webOrigin,
      corsOrigins: [],
      proxySecret: undefined,
      db,
      emailSender: email,
      authSecret: 'fedcba9876543210'.repeat(2),
      google: undefined
    })
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
    url = `http://127.0.0.1:${(server.address() as AddressInfo).port}`
  })

  beforeEach(() => {
    const realFetch = globalThis.fetch
    // The breach check calls out with `fetch`: no password here is breached.
    vi.stubGlobal('fetch', async (input: string | URL | Request, init?: RequestInit) =>
      String(input).startsWith('https://api.pwnedpasswords.com/range/') ? new Response('') : realFetch(input, init)
    )
  })

  afterAll(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()))
    await db.destroy()
  })

  const nextIp = () => `192.0.2.${++lastIp % 250}`

  const post = (path: string, body: unknown, cookie = '') =>
    fetch(`${url}/api/auth${path}`, {
      method: 'POST',
      headers: { Origin: webOrigin, 'X-Client-IP': nextIp(), 'Content-Type': 'application/json', Cookie: cookie },
      body: JSON.stringify(body)
    })

  const get = (path: string, cookie = '') =>
    fetch(`${url}${path}`, { headers: { 'X-Client-IP': nextIp(), Cookie: cookie } })

  const outcome = async (response: Response | Promise<Response>) => {
    const settled = await response
    const body = (await settled.json().catch(() => null)) as { code?: string } | null
    return { status: settled.status, code: body?.code }
  }

  const cookieOf = (response: Response) =>
    response.headers
      .getSetCookie()
      .map((cookie) => cookie.split(';')[0])
      .join('; ')

  const emailsTo = (to: string) => email.sent.filter((sent) => sent.to === to)
  const linkIn = (text: string) => new URL(text.match(/https?:\/\/\S+/)?.[0] ?? '')

  /** A confirmed account, signed in. */
  async function account(locale = 'en'): Promise<Person> {
    const address = `leaving-${++lastAccount}@example.com`
    await post('/sign-up/email', { name: `Person ${lastAccount}`, email: address, password, locale })
    const confirm = linkIn((emailsTo(address).at(-1) as { text: string }).text)
    await get(confirm.pathname + confirm.search)
    const signedIn = await post('/sign-in/email', { email: address, password })
    const { user } = (await signedIn.clone().json()) as { user: { id: string } }
    return { id: user.id, email: address, cookie: cookieOf(signedIn) }
  }

  async function organization(owner: Person, name: string) {
    const created = await post(
      '/organization/create',
      { name, slug: `${name.toLowerCase()}-${lastAccount}` },
      owner.cookie
    )
    return ((await created.json()) as { id: string }).id
  }

  async function join(organizationId: string, owner: Person, person: Person, role: string) {
    const invited = await post(
      '/organization/invite-member',
      { organizationId, email: person.email, role },
      owner.cookie
    )
    const { id } = (await invited.json()) as { id: string }
    await post('/organization/accept-invitation', { invitationId: id }, person.cookie)
  }

  const plan = async (person: Person) => {
    const response = await get('/api/me/account-deletion', person.cookie)
    return accountDeletionSchema
      .parse(await response.json())
      .organizations.map(({ name, outcome }) => ({ name, outcome }))
  }

  /** Asks for the deletion, then follows the emailed page's button: the token goes back with the session. */
  async function deleteAccount(person: Person) {
    await post('/delete-user', {}, person.cookie)
    const link = linkIn((emailsTo(person.email).at(-1) as { text: string }).text)
    return post('/delete-user', { token: link.searchParams.get('token') }, person.cookie)
  }

  const count = async (table: string, column: string, value: string) =>
    (
      await sql<{
        n: number
      }>`select count(*)::int as n from ${sql.table(`auth.${table}`)} where ${sql.ref(column)} = ${value}`.execute(db)
    ).rows[0]?.n

  it('needs a session to read what would be deleted, and to ask for it', async () => {
    expect((await get('/api/me/account-deletion')).status).toBe(401)
    expect((await post('/delete-user', {})).status).toBe(401)
  })

  it('says, before anything happens, which organizations go, which it leaves and which block it', async () => {
    const ada = await account()
    const bob = await account()
    const alone = await organization(ada, 'Alone')
    const shared = await organization(ada, 'Shared')
    const theirs = await organization(bob, 'Theirs')
    await join(shared, ada, bob, 'member')
    await join(theirs, bob, ada, 'admin')
    await join(alone, ada, ada, 'owner') // already a member: changes nothing

    expect(await plan(ada)).toEqual([
      { name: 'Alone', outcome: 'deleted' },
      { name: 'Shared', outcome: 'blocked' },
      { name: 'Theirs', outcome: 'left' }
    ])
  })

  it('emails a link to a web page, in the user’s language, and deletes nothing yet', async () => {
    const ada = await account('pt-BR')

    const asked = await post('/delete-user', {}, ada.cookie)

    expect(asked.status).toBe(200)
    const sent = emailsTo(ada.email).at(-1) as { subject: string; text: string }
    expect(sent.subject).toBe('Confirme a exclusão da sua conta')
    expect(linkIn(sent.text).pathname).toBe('/settings/delete-account')
    expect(await count('user', 'id', ada.id)).toBe(1)
  })

  it('deletes the account and everything only it holds once the page sends the token back', async () => {
    const ada = await account()
    const bob = await account()
    const alone = await organization(ada, 'Alone')
    const shared = await organization(bob, 'Shared')
    await join(shared, bob, ada, 'admin')
    await post(
      '/organization/invite-member',
      { organizationId: shared, email: 'someone@example.com', role: 'member' },
      ada.cookie
    )
    await post('/two-factor/enable', { password }, ada.cookie)

    const deleted = await deleteAccount(ada)

    expect(await outcome(deleted)).toMatchObject({ status: 200 })
    for (const [table, column] of [
      ['user', 'id'],
      ['session', 'userId'],
      ['account', 'userId'],
      ['twoFactor', 'userId'],
      ['member', 'userId'],
      ['invitation', 'inviterId']
    ] as const) {
      expect({ table, rows: await count(table, column, ada.id) }).toEqual({ table, rows: 0 })
    }
    expect(await count('organization', 'id', alone)).toBe(0)
    expect(await count('organization', 'id', shared)).toBe(1)
    expect((await get('/api/me', ada.cookie)).status).toBe(401)
  })

  it('refuses at once, and emails nothing, while the user is the only owner of an organization they share', async () => {
    const ada = await account()
    const bob = await account()
    const shared = await organization(ada, 'Shared')
    await join(shared, ada, bob, 'admin')
    const before = emailsTo(ada.email).length

    expect(await outcome(post('/delete-user', {}, ada.cookie))).toEqual({
      status: 403,
      code: 'SOLE_OWNER_OF_SHARED_ORGANIZATION'
    })
    expect(emailsTo(ada.email)).toHaveLength(before)
  })

  it('checks again with the token, since an owner may have left after the link was sent', async () => {
    const ada = await account()
    const bob = await account()
    const carol = await account()
    const shared = await organization(bob, 'Shared')
    await join(shared, bob, ada, 'owner')
    await join(shared, bob, carol, 'member')
    await post('/delete-user', {}, ada.cookie)
    const link = linkIn((emailsTo(ada.email).at(-1) as { text: string }).text)
    await post('/organization/leave', { organizationId: shared }, bob.cookie)

    const refused = post('/delete-user', { token: link.searchParams.get('token') }, ada.cookie)

    expect(await outcome(refused)).toEqual({ status: 403, code: 'SOLE_OWNER_OF_SHARED_ORGANIZATION' })
    expect(await count('user', 'id', ada.id)).toBe(1)
  })

  it('lets an owner go once another owner stays', async () => {
    const ada = await account()
    const bob = await account()
    const shared = await organization(ada, 'Shared')
    await join(shared, ada, bob, 'owner')

    expect(await plan(ada)).toEqual([{ name: 'Shared', outcome: 'left' }])
    expect((await deleteAccount(ada)).status).toBe(200)
    expect(await count('organization', 'id', shared)).toBe(1)
  })

  it('refuses a token sent with another user’s session', async () => {
    const ada = await account()
    const eve = await account()
    await post('/delete-user', {}, ada.cookie)
    const link = linkIn((emailsTo(ada.email).at(-1) as { text: string }).text)

    const refused = await post('/delete-user', { token: link.searchParams.get('token') }, eve.cookie)

    expect(refused.status).toBe(404)
    expect(await count('user', 'id', ada.id)).toBe(1)
    expect(await count('user', 'id', eve.id)).toBe(1)
  })
})
