import type { Server } from 'node:http'
import type { AddressInfo } from 'node:net'
import { fileURLToPath } from 'node:url'
import { invitationSchema, organizationMembershipSchema } from '@repo/contracts'
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

type Person = { email: string; cookie: string; memberId: string }

describe('organizations through Better Auth (ADR 0033)', () => {
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
      clock: new FixedClock(new Date('2026-11-04T12:00:00.000Z')),
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

  /** Every call comes from a new address, so the rate limits under test are the only ones that count. */
  const nextIp = () => `198.51.100.${++lastIp % 250}`

  const post = (path: string, body: unknown, cookie = '', ip = nextIp()) =>
    fetch(`${url}/api/auth${path}`, {
      method: 'POST',
      headers: { Origin: webOrigin, 'X-Client-IP': ip, 'Content-Type': 'application/json', Cookie: cookie },
      body: JSON.stringify(body)
    })

  const get = (path: string, cookie = '') =>
    fetch(`${url}${path}`, { headers: { 'X-Client-IP': nextIp(), Cookie: cookie } })

  /** Status and Better Auth's error code, the two things the web reads from a refusal. */
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

  const lastEmailTo = (to: string) => {
    const message = email.sent.findLast((sent) => sent.to === to)
    if (message === undefined) throw new Error(`Nothing was emailed to ${to}`)
    return message
  }

  const linkIn = (text: string) => new URL(text.match(/https?:\/\/\S+/)?.[0] ?? '')

  /** A confirmed account, signed in. */
  async function account(locale = 'en') {
    const address = `person-${++lastAccount}@example.com`
    await post('/sign-up/email', { name: `Person ${lastAccount}`, email: address, password, locale })
    const confirm = linkIn(lastEmailTo(address).text)
    await get(confirm.pathname + confirm.search)
    return { email: address, cookie: cookieOf(await post('/sign-in/email', { email: address, password })) }
  }

  /** The settings ADR 0053 asks for at creation, unless the test overrides them. */
  const settings = { timeZone: 'America/Sao_Paulo', currency: 'BRL' }

  const createOrganization = (cookie: string, name: string, slug: string, overrides: Record<string, unknown> = {}) =>
    post('/organization/create', { name, slug, ...settings, ...overrides }, cookie)

  const invite = (cookie: string, organizationId: string, address: string, role: string, ip?: string) =>
    post('/organization/invite-member', { organizationId, email: address, role }, cookie, ip)

  const memberIdOf = async (cookie: string, organizationId: string, address: string) => {
    const listing = await get(`/api/auth/organization/list-members?organizationId=${organizationId}`, cookie)
    const { members } = (await listing.json()) as { members: { id: string; user: { email: string } }[] }
    return members.find((member) => member.user.email === address)?.id ?? ''
  }

  const createRole = (cookie: string, organizationId: string, role: string, permission: Record<string, string[]>) =>
    post('/organization/create-role', { organizationId, role, permission }, cookie)

  /**
   * An organization whose owner first creates `customRoles`, then invites one new account per entry of
   * `roles`, each of whom accepts.
   */
  async function organization(
    roles: Record<string, string>,
    customRoles: Record<string, Record<string, string[]>> = {}
  ) {
    const owner = await account()
    const created = await createOrganization(owner.cookie, 'Acme', `acme-${lastAccount}`)
    const { id } = (await created.json()) as { id: string }
    for (const [role, permission] of Object.entries(customRoles)) await createRole(owner.cookie, id, role, permission)
    const people: Record<string, Person> = {
      owner: { ...owner, memberId: await memberIdOf(owner.cookie, id, owner.email) }
    }
    for (const [name, role] of Object.entries(roles)) {
      const person = await account()
      const invitation = (await (await invite(owner.cookie, id, person.email, role)).json()) as { id: string }
      await post('/organization/accept-invitation', { invitationId: invitation.id }, person.cookie)
      people[name] = { ...person, memberId: await memberIdOf(owner.cookie, id, person.email) }
    }
    return { id, people: people as Record<string, Person> & { owner: Person } }
  }

  const person = (people: Record<string, Person>, name: string) => people[name] as Person

  describe('GET /api/organizations/:organizationId/me', () => {
    const me = (organizationId: string, cookie = '') => get(`/api/organizations/${organizationId}/me`, cookie)

    it('answers 401 without a session', async () => {
      const { id } = await organization({})

      expect((await me(id)).status).toBe(401)
    })

    it('answers 404 for an organization that does not exist', async () => {
      const { cookie } = await account()

      expect(await outcome(me('no-such-organization', cookie))).toEqual({ status: 404, code: 'organization_not_found' })
    })

    it('answers the same 404 for an organization the caller is not in', async () => {
      const { id } = await organization({})
      const { cookie } = await account()

      expect(await outcome(me(id, cookie))).toEqual({ status: 404, code: 'organization_not_found' })
    })

    it('answers the roles and permissions of a built-in role', async () => {
      const { id, people } = await organization({ member: 'member' })

      const response = await me(id, person(people, 'member').cookie)

      expect(response.status).toBe(200)
      expect(organizationMembershipSchema.parse(await response.json())).toEqual({
        roles: ['member'],
        permissions: { ac: ['read'], customer: ['read', 'create', 'update'] }
      })
    })

    it('answers the permissions of a custom role', async () => {
      const { id, people } = await organization({ editor: 'editor' }, { editor: { invitation: ['create'] } })

      const response = await me(id, person(people, 'editor').cookie)

      expect(organizationMembershipSchema.parse(await response.json())).toEqual({
        roles: ['editor'],
        permissions: { invitation: ['create'] }
      })
    })
  })

  describe('names and slugs', () => {
    it('creates an organization with a valid name and slug, its creator as owner', async () => {
      const { cookie } = await account()

      const created = await createOrganization(cookie, 'Acme Inc', 'acme-inc')

      expect(created.status).toBe(200)
      expect(await created.json()).toMatchObject({ name: 'Acme Inc', slug: 'acme-inc', members: [{ role: 'owner' }] })
    })

    it.each([
      ['spaces and punctuation', 'Has Spaces/And?Query'],
      ['capitals', 'Acme'],
      ['a reserved word', 'settings']
    ])('refuses a slug with %s', async (_case, slug) => {
      const { cookie } = await account()

      expect(await outcome(createOrganization(cookie, 'Acme', slug))).toEqual({
        status: 400,
        code: 'INVALID_ORGANIZATION_SLUG'
      })
    })

    it('refuses an empty name', async () => {
      const { cookie } = await account()

      expect(await outcome(createOrganization(cookie, '   ', 'acme-empty'))).toEqual({
        status: 400,
        code: 'INVALID_ORGANIZATION_NAME'
      })
    })

    it('checks the name and the slug on update, each only when it is sent', async () => {
      const { id, people } = await organization({})
      const update = (data: Record<string, string>) =>
        post('/organization/update', { organizationId: id, data }, people.owner.cookie)

      expect(await outcome(update({ slug: 'Bad Slug' }))).toEqual({ status: 400, code: 'INVALID_ORGANIZATION_SLUG' })
      expect(await outcome(update({ name: '   ' }))).toEqual({ status: 400, code: 'INVALID_ORGANIZATION_NAME' })
      expect((await update({ name: 'Acme Renamed' })).status).toBe(200)
      expect((await update({ slug: `renamed-${lastAccount}` })).status).toBe(200)
    })

    it('keeps one membership per user and one role name per organization, even under a race', async () => {
      const { id, people } = await organization({ member: 'member' })
      const userId = (
        await sql<{
          userId: string
        }>`select "userId" from auth.member where id = ${person(people, 'member').memberId}`.execute(db)
      ).rows[0]?.userId
      await createRole(people.owner.cookie, id, 'editor', { invitation: ['create'] })

      const duplicateMember = sql`insert into auth.member (id, "organizationId", "userId", role, "createdAt")
        values ('dup-member', ${id}, ${userId}, 'member', now())`.execute(db)
      const duplicateRole = sql`insert into auth."organizationRole" (id, "organizationId", role, permission)
        values ('dup-role', ${id}, 'editor', '{}')`.execute(db)

      await expect(duplicateMember).rejects.toThrow(/unique/)
      await expect(duplicateRole).rejects.toThrow(/unique/)
    })
  })

  describe('time zone and currency (ADR 0053)', () => {
    it('creates an organization with its time zone and currency, and lists it with them', async () => {
      const { cookie } = await account()

      const created = await createOrganization(cookie, 'Acme', `acme-settings-${lastAccount}`)
      const listing = await get('/api/auth/organization/list', cookie)

      expect(await created.json()).toMatchObject({ timeZone: 'America/Sao_Paulo', currency: 'BRL' })
      expect(await listing.json()).toEqual([
        expect.objectContaining({ timeZone: 'America/Sao_Paulo', currency: 'BRL' })
      ])
    })

    it.each([
      ['no time zone', { timeZone: undefined }],
      ['no currency', { currency: undefined }]
    ])('refuses a creation with %s', async (_case, overrides) => {
      const { cookie } = await account()

      expect((await createOrganization(cookie, 'Acme', `acme-missing-${lastAccount}`, overrides)).status).toBe(400)
    })

    it.each([
      ['an unknown time zone', { timeZone: 'Mars/Olympus_Mons' }, 'INVALID_TIME_ZONE'],
      ['an offset for a time zone', { timeZone: '-03:00' }, 'INVALID_TIME_ZONE'],
      ['a currency not offered', { currency: 'XXX' }, 'INVALID_CURRENCY']
    ])('refuses a creation with %s', async (_case, overrides, code) => {
      const { cookie } = await account()

      expect(await outcome(createOrganization(cookie, 'Acme', `acme-invalid-${lastAccount}`, overrides))).toEqual({
        status: 400,
        code
      })
    })

    it('lets whoever may update the organization change each setting, checked as it is sent', async () => {
      const { id, people } = await organization({ admin: 'admin' })
      const update = (data: Record<string, unknown>) =>
        post('/organization/update', { organizationId: id, data }, person(people, 'admin').cookie)

      expect(await outcome(update({ timeZone: 'Atlantis/Capital' }))).toEqual({
        status: 400,
        code: 'INVALID_TIME_ZONE'
      })
      expect(await outcome(update({ currency: 'brl' }))).toEqual({ status: 400, code: 'INVALID_CURRENCY' })
      expect((await update({ timeZone: null })).status).toBe(400)
      expect((await update({ timeZone: 'Europe/Lisbon' })).status).toBe(200)
      expect(await (await update({ currency: 'EUR' })).json()).toMatchObject({
        timeZone: 'Europe/Lisbon',
        currency: 'EUR'
      })
    })

    it('refuses a change of the settings to a member who may not update the organization', async () => {
      const { id, people } = await organization({ member: 'member' })

      expect(
        await outcome(
          post(
            '/organization/update',
            { organizationId: id, data: { currency: 'EUR' } },
            person(people, 'member').cookie
          )
        )
      ).toEqual({ status: 403, code: 'YOU_ARE_NOT_ALLOWED_TO_UPDATE_THIS_ORGANIZATION' })
    })
  })

  describe('invitations', () => {
    it('emails the invitee a link to the web, in the inviter’s language, valid for 7 days', async () => {
      const owner = await account('pt-BR')
      const { id } = (await (await createOrganization(owner.cookie, 'Acme', `acme-pt-${lastAccount}`)).json()) as {
        id: string
      }
      const invitee = 'invitee-pt@example.com'

      const invitation = (await (await invite(owner.cookie, id, invitee, 'member')).json()) as {
        id: string
        expiresAt: string
      }

      const message = lastEmailTo(invitee)
      expect(linkIn(message.text).href).toBe(`${webOrigin}/invitations/${invitation.id}`)
      expect(message.subject).toContain('Acme')
      expect(message.text).toContain(owner.email)
      expect(message.text).toContain('7 dias')
      expect(new Date(invitation.expiresAt).getTime() - Date.now()).toBeGreaterThan(6.9 * 24 * 3600 * 1000)
    })

    it('lets the invited person, and only them, accept with a confirmed email', async () => {
      const owner = await account()
      const { id } = (await (await createOrganization(owner.cookie, 'Acme', `acme-in-${lastAccount}`)).json()) as {
        id: string
      }
      const invitee = await account()
      const stranger = await account()
      const invitation = (await (await invite(owner.cookie, id, invitee.email, 'member')).json()) as { id: string }

      expect(
        await outcome(post('/organization/accept-invitation', { invitationId: invitation.id }, stranger.cookie))
      ).toEqual({
        status: 403,
        code: 'YOU_ARE_NOT_THE_RECIPIENT_OF_THE_INVITATION'
      })
      expect(
        (await post('/organization/accept-invitation', { invitationId: invitation.id }, invitee.cookie)).status
      ).toBe(200)
    })

    it('counts at most 10 invitations a minute per inviter, from any address', async () => {
      const { id, people } = await organization({})

      for (let n = 0; n < 10; n++)
        expect((await invite(people.owner.cookie, id, `burst-${n}@example.com`, 'member')).status).toBe(200)

      expect(await outcome(invite(people.owner.cookie, id, 'burst-10@example.com', 'member'))).toEqual({
        status: 429,
        code: 'TOO_MANY_INVITATIONS'
      })
    })

    it('counts at most 10 invitations a minute per address, from any inviter', async () => {
      const first = await organization({})
      const second = await organization({})
      const ip = nextIp()

      for (let n = 0; n < 5; n++)
        await invite(first.people.owner.cookie, first.id, `ip-a-${n}@example.com`, 'member', ip)
      for (let n = 0; n < 5; n++)
        await invite(second.people.owner.cookie, second.id, `ip-b-${n}@example.com`, 'member', ip)

      expect((await invite(second.people.owner.cookie, second.id, 'ip-b-5@example.com', 'member', ip)).status).toBe(429)
    })
  })

  describe('GET /api/invitations/:invitationId', () => {
    const read = (invitationId: string, cookie = '') => get(`/api/invitations/${invitationId}`, cookie)

    /** An invitation from a new organization's owner to a new account, and both of them. */
    async function invited() {
      const { id, people } = await organization({})
      const invitee = await account()
      const created = await invite(people.owner.cookie, id, invitee.email, 'member')
      const { id: invitationId } = (await created.json()) as { id: string }
      return { organizationId: id, owner: people.owner, invitee, invitationId }
    }

    const setStatus = (invitationId: string, status: string) =>
      sql`update auth.invitation set status = ${status} where id = ${invitationId}`.execute(db)

    it('answers 401 without a session', async () => {
      const { invitationId } = await invited()

      expect((await read(invitationId)).status).toBe(401)
    })

    it('answers 404 for an invitation that does not exist', async () => {
      const { cookie } = await account()

      expect(await outcome(read('no-such-invitation', cookie))).toEqual({ status: 404, code: 'invitation_not_found' })
    })

    it('answers 403 to an account the invitation was not sent to, and tells it nothing more', async () => {
      const { invitationId } = await invited()
      const stranger = await account()

      const response = await read(invitationId, stranger.cookie)

      expect(response.status).toBe(403)
      const body = (await response.json()) as Record<string, unknown>
      expect(body.code).toBe('not_the_recipient')
      expect(JSON.stringify(body)).not.toContain('Acme')
    })

    it('tells the invitee the organization, who invited them and that the invitation is open', async () => {
      const { owner, invitee, invitationId } = await invited()

      const response = await read(invitationId, invitee.cookie)

      expect(response.status).toBe(200)
      const invitation = invitationSchema.parse(await response.json())
      expect(invitation).toMatchObject({
        id: invitationId,
        organizationName: 'Acme',
        inviterName: owner.email.replace(/^person-(\d+)@example\.com$/, 'Person $1'),
        status: 'pending',
        member: false
      })
      expect(invitation.organizationSlug).toMatch(/^acme-\d+$/)
    })

    it('says the invitation expired once its date has passed, though the plugin keeps it pending', async () => {
      const { invitee, invitationId } = await invited()
      await sql`update auth.invitation set "expiresAt" = '2026-11-01T00:00:00Z' where id = ${invitationId}`.execute(db)

      const invitation = invitationSchema.parse(await (await read(invitationId, invitee.cookie)).json())

      expect(invitation.status).toBe('expired')
    })

    it('says it was accepted, and whether the invitee is still a member', async () => {
      const { organizationId, owner, invitee, invitationId } = await invited()
      await post('/organization/accept-invitation', { invitationId }, invitee.cookie)

      expect(invitationSchema.parse(await (await read(invitationId, invitee.cookie)).json())).toMatchObject({
        status: 'accepted',
        member: true
      })

      const memberId = await memberIdOf(owner.cookie, organizationId, invitee.email)
      await post('/organization/remove-member', { organizationId, memberIdOrEmail: memberId }, owner.cookie)
      expect(invitationSchema.parse(await (await read(invitationId, invitee.cookie)).json())).toMatchObject({
        status: 'accepted',
        member: false
      })
    })

    it('says it was declined or withdrawn, in the web’s words for the plugin’s statuses', async () => {
      const { invitee, invitationId } = await invited()

      await setStatus(invitationId, 'rejected')
      expect(invitationSchema.parse(await (await read(invitationId, invitee.cookie)).json()).status).toBe('declined')
      await setStatus(invitationId, 'canceled')
      expect(invitationSchema.parse(await (await read(invitationId, invitee.cookie)).json()).status).toBe('withdrawn')
    })

    it('matches the invitee’s address whatever its case', async () => {
      const { invitee, invitationId } = await invited()
      await sql`update auth.invitation set email = upper(email) where id = ${invitationId}`.execute(db)

      expect((await read(invitationId, invitee.cookie)).status).toBe(200)
    })
  })

  describe('no escalation (ADR 0033)', () => {
    it('refuses a role that grants more than its creator holds', async () => {
      const { id, people } = await organization({ admin: 'admin' })

      expect(
        await outcome(createRole(person(people, 'admin').cookie, id, 'publisher', { member: ['create'], ac: ['read'] }))
      ).toEqual({
        status: 200,
        code: undefined
      })
      expect(
        await outcome(
          post(
            '/organization/update-role',
            {
              organizationId: id,
              roleName: 'publisher',
              data: { permission: { organization: ['update'], invitation: ['create'] } }
            },
            person(people, 'admin').cookie
          )
        )
      ).toEqual({ status: 200, code: undefined })
      const manager = await organization(
        { manager: 'manager' },
        { manager: { ac: ['create'], invitation: ['create'] } }
      )

      expect(
        await outcome(createRole(person(manager.people, 'manager').cookie, manager.id, 'boss', { member: ['delete'] }))
      ).toEqual({
        status: 403,
        code: 'YOU_ARE_NOT_ALLOWED_TO_CREATE_A_ROLE'
      })
    })

    it('keeps the owner-only permission out of every custom role', async () => {
      const { id, people } = await organization({})
      await createRole(people.owner.cookie, id, 'keeper', { organization: ['update'] })

      expect(
        await outcome(createRole(people.owner.cookie, id, 'boss', { organization: ['update', 'delete'] }))
      ).toEqual({
        status: 400,
        code: 'OWNER_ONLY_PERMISSION'
      })
      expect(
        await outcome(
          post(
            '/organization/update-role',
            { organizationId: id, roleName: 'keeper', data: { permission: { organization: ['delete'] } } },
            people.owner.cookie
          )
        )
      ).toEqual({ status: 400, code: 'OWNER_ONLY_PERMISSION' })
    })

    it('refuses a role name that is not a lowercase word', async () => {
      const { id, people } = await organization({})
      await createRole(people.owner.cookie, id, 'keeper', { member: ['create'] })

      expect(await outcome(createRole(people.owner.cookie, id, 'Sales Lead', { member: ['create'] }))).toEqual({
        status: 400,
        code: 'INVALID_ROLE_NAME'
      })
      expect(
        await outcome(
          post(
            '/organization/update-role',
            { organizationId: id, roleName: 'keeper', data: { roleName: 'owner' } },
            people.owner.cookie
          )
        )
      ).toEqual({ status: 400, code: 'INVALID_ROLE_NAME' })
    })

    it('refuses an invitation to a role that grants more than the inviter holds', async () => {
      const { id, people } = await organization({ recruiter: 'recruiter' }, { recruiter: { invitation: ['create'] } })

      expect(await outcome(invite(person(people, 'recruiter').cookie, id, 'alt@example.com', 'admin'))).toEqual({
        status: 403,
        code: 'ROLE_EXCEEDS_YOUR_PERMISSIONS'
      })
      expect((await invite(person(people, 'recruiter').cookie, id, 'alt@example.com', 'recruiter')).status).toBe(200)
    })

    it('refuses a role change to a role that grants more than the one making it holds', async () => {
      const { id, people } = await organization(
        { admin: 'admin', manager: 'manager', member: 'member' },
        {
          manager: { member: ['update'] },
          boss: { organization: ['update'], member: ['update'], invitation: ['create'], ac: ['read'] }
        }
      )
      const change = (who: string, memberId: string, role: string | string[]) =>
        post('/organization/update-member-role', { organizationId: id, memberId, role }, person(people, who).cookie)

      expect(await outcome(change('manager', person(people, 'manager').memberId, 'admin'))).toEqual({
        status: 403,
        code: 'ROLE_EXCEEDS_YOUR_PERMISSIONS'
      })
      expect(await outcome(change('admin', person(people, 'member').memberId, ['member', 'boss']))).toEqual({
        status: 200,
        code: undefined
      })
    })

    it('refuses to change or remove a member whose roles grant more than the actor holds', async () => {
      const { id, people } = await organization(
        { manager: 'manager', admin: 'admin' },
        { manager: { member: ['update', 'delete'] } }
      )

      expect(
        await outcome(
          post(
            '/organization/update-member-role',
            { organizationId: id, memberId: person(people, 'admin').memberId, role: 'member' },
            person(people, 'manager').cookie
          )
        )
      ).toEqual({ status: 403, code: 'MEMBER_OUTRANKS_YOU' })
      expect(
        await outcome(
          post(
            '/organization/remove-member',
            { organizationId: id, memberIdOrEmail: person(people, 'admin').email },
            person(people, 'manager').cookie
          )
        )
      ).toEqual({ status: 403, code: 'MEMBER_OUTRANKS_YOU' })
      expect(
        (
          await post(
            '/organization/remove-member',
            { organizationId: id, memberIdOrEmail: person(people, 'manager').memberId },
            person(people, 'admin').cookie
          )
        ).status
      ).toBe(200)
    })

    it('leaves a missing session, a non-member and an unknown member to the plugin’s own answers', async () => {
      const { id, people } = await organization({})
      const outsider = await account()

      expect((await invite('', id, 'x@example.com', 'member')).status).toBe(401)
      expect(await outcome(invite(outsider.cookie, id, 'x@example.com', 'member'))).toEqual({
        status: 400,
        code: 'MEMBER_NOT_FOUND'
      })
      expect(
        await outcome(
          post(
            '/organization/update-member-role',
            { organizationId: id, memberId: 'no-such-member', role: 'member' },
            people.owner.cookie
          )
        )
      ).toEqual({ status: 400, code: 'MEMBER_NOT_FOUND' })
    })

    it('asks for the organization id on every guarded write, never using the active organization (D1)', async () => {
      const { people } = await organization({})

      expect(
        await outcome(
          post('/organization/invite-member', { email: 'x@example.com', role: 'member' }, people.owner.cookie)
        )
      ).toEqual({
        status: 400,
        code: 'ORGANIZATION_ID_REQUIRED'
      })
    })
  })

  describe('roles in use', () => {
    it('refuses to rename a role that a member holds', async () => {
      const { id, people } = await organization({ editor: 'editor' }, { editor: { invitation: ['create'] } })

      expect(
        await outcome(
          post(
            '/organization/update-role',
            { organizationId: id, roleName: 'editor', data: { roleName: 'writer' } },
            people.owner.cookie
          )
        )
      ).toEqual({ status: 400, code: 'ROLE_IN_USE' })
    })

    it('refuses to delete a role that only a pending invitation holds', async () => {
      const { id, people } = await organization({}, { temp: { invitation: ['create'] } })
      await invite(people.owner.cookie, id, 'late@example.com', 'temp')

      expect(
        await outcome(post('/organization/delete-role', { organizationId: id, roleName: 'temp' }, people.owner.cookie))
      ).toEqual({
        status: 400,
        code: 'ROLE_IN_USE'
      })
    })

    it('renames, edits and deletes a role nobody holds, by name or by id', async () => {
      const { id, people } = await organization({}, { spare: { invitation: ['create'] } })
      const [{ id: roleId } = { id: '' }] = (await (
        await get(`/api/auth/organization/list-roles?organizationId=${id}`, people.owner.cookie)
      ).json()) as { id: string }[]

      expect(
        (
          await post(
            '/organization/update-role',
            { organizationId: id, roleId, data: { roleName: 'extra' } },
            people.owner.cookie
          )
        ).status
      ).toBe(200)
      expect(
        (
          await post(
            '/organization/update-role',
            { organizationId: id, roleName: 'extra', data: { permission: { member: ['create'] } } },
            people.owner.cookie
          )
        ).status
      ).toBe(200)
      expect(
        (await post('/organization/delete-role', { organizationId: id, roleId }, people.owner.cookie)).status
      ).toBe(200)
    })
  })

  describe('deletion (D7)', () => {
    it('lets an owner delete the organization, with its members, invitations and roles', async () => {
      const { id, people } = await organization({ member: 'member' }, { spare: { invitation: ['create'] } })
      await invite(people.owner.cookie, id, 'pending@example.com', 'member')

      expect((await post('/organization/delete', { organizationId: id }, people.owner.cookie)).status).toBe(200)
      const left = await sql<{ n: string }>`
        select (select count(*) from auth.member where "organizationId" = ${id})
             + (select count(*) from auth.invitation where "organizationId" = ${id})
             + (select count(*) from auth."organizationRole" where "organizationId" = ${id}) as n`.execute(db)
      expect(left.rows[0]?.n).toBe('0')
    })

    it('refuses a member who is not an owner, even with a role that holds the deletion', async () => {
      const { id, people } = await organization({ member: 'member' })
      // A role row written around the API, as an older version could have left it.
      await sql`insert into auth."organizationRole" (id, "organizationId", role, permission)
        values ('legacy', ${id}, 'legacy', '{"organization":["delete"]}')`.execute(db)
      await sql`update auth.member set role = 'legacy' where id = ${person(people, 'member').memberId}`.execute(db)

      expect(
        await outcome(post('/organization/delete', { organizationId: id }, person(people, 'member').cookie))
      ).toEqual({
        status: 403,
        code: 'ONLY_AN_OWNER_DELETES'
      })
    })
  })

  describe('customers behind the tenant guard (ADR 0044)', () => {
    const customers = (organizationId: string) => `/api/organizations/${organizationId}/customers`
    const send = (method: string, path: string, cookie: string, body?: unknown) =>
      fetch(`${url}${path}`, {
        method,
        headers: { Origin: webOrigin, 'X-Client-IP': nextIp(), 'Content-Type': 'application/json', Cookie: cookie },
        body: body === undefined ? null : JSON.stringify(body)
      })

    it('lets a member create and read, but not delete, and keeps one organization out of another', async () => {
      const { id, people } = await organization({ member: 'member' })
      const member = person(people, 'member').cookie
      const owner = person(people, 'owner').cookie

      const created = await send('POST', customers(id), member, { name: 'Ada', email: 'ada@example.com' })
      const { id: customerId } = (await created.json()) as { id: string }
      expect(created.status).toBe(201)
      expect(((await (await send('GET', customers(id), member)).json()) as { total: number }).total).toBe(1)

      await send('POST', `${customers(id)}/${customerId}/archive`, member)
      expect((await send('DELETE', `${customers(id)}/${customerId}`, member)).status).toBe(403)
      expect((await send('DELETE', `${customers(id)}/${customerId}`, owner)).status).toBe(204)

      const other = await organization({})
      expect((await send('GET', customers(other.id), member)).status).toBe(404)
    })

    it('goes with the organization when the owner deletes it', async () => {
      const { id, people } = await organization({})
      const owner = person(people, 'owner').cookie
      await send('POST', customers(id), owner, { name: 'Ada' })

      await post('/organization/delete', { organizationId: id }, owner)

      const rows = await sql<{ count: string }>`select count(*) from customer where organization_id = ${id}`.execute(db)
      expect(rows.rows[0]?.count).toBe('0')
    })
  })
})
