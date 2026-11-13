import type { Server } from 'node:http'
import type { AddressInfo } from 'node:net'
import { fileURLToPath } from 'node:url'
import {
  billingPageSchema,
  billingSchema,
  gracePeriod,
  organizationMembershipSchema,
  plans,
  prorateUpgrade
} from '@repo/contracts'
import { sql } from 'kysely'
import pino from 'pino'
import { inject } from 'vitest'
import { FakeBillingProvider } from '#libs/adapters/fake-billing-provider'
import { FixedClock } from '#libs/adapters/fixed-clock'
import { ManualTimer } from '#libs/adapters/manual-timer'
import { RecordingEmailSender } from '#libs/adapters/recording-email-sender'
import { UuidGenerator } from '#libs/adapters/uuid-generator'
import { createDatabase, createPool } from '#libs/database/database'
import { runMigrations } from '#libs/database/migrations'
import { resetDatabase } from '../../test/reset-database'
import { createApp } from './create-app'
import { createJobs } from './create-jobs'

const webOrigin = 'http://localhost:5173'
const migrations = fileURLToPath(new URL('../../migrations/', import.meta.url))
const password = 'correct horse battery staple'
const token = 'billing-db-test-token-0123'
const day = 24 * 60 * 60 * 1000
const returnTo = '/acme/settings/billing'

/**
 * Billing through the whole API on Postgres (ADR 0063): Better Auth's accounts and organizations, the
 * billing routes, the fake provider driven through its webhook as the end-to-end suite drives it, the
 * webhook inbox, and the jobs, run by the test with `drain()`. One clock for all, which the test moves.
 */
describe('billing through the API (ADR 0063)', () => {
  const logger = pino({ level: 'silent' })
  /** Every statement the app sends, counted: a forged notice must cost none. */
  let statements = 0
  const db = createDatabase(createPool(inject('databaseUrl'), logger)).withPlugin({
    transformQuery: (args) => {
      statements += 1
      return args.node
    },
    transformResult: async (args) => args.result
  })
  const email = new RecordingEmailSender()
  const clock = new FixedClock(new Date('2026-11-04T12:00:00.000Z'))
  /** The fake's own completions, as in `pnpm dev`: they happen only when a test moves this timer. */
  const development = new ManualTimer(clock)
  const billing = new FakeBillingProvider({
    clock,
    ids: new UuidGenerator(),
    token,
    autoComplete: { afterMs: 3_000, timer: development }
  })
  const jobs = createJobs({
    db,
    clock,
    logger,
    emailSender: email,
    billing,
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
    // The breach check calls out with `fetch`: no password here is breached.
    vi.stubGlobal('fetch', async (input: string | URL | Request, init?: RequestInit) =>
      String(input).startsWith('https://api.pwnedpasswords.com/range/') ? new Response('') : realFetch(input, init)
    )
  })

  afterAll(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()))
    await db.destroy()
  })

  const nextIp = () => `198.51.100.${++lastIp % 250}`

  const request = (method: string, path: string, cookie = '', body?: unknown, headers: Record<string, string> = {}) =>
    fetch(`${url}${path}`, {
      method,
      headers: {
        Origin: webOrigin,
        'X-Client-IP': nextIp(),
        Cookie: cookie,
        ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
        ...headers
      },
      body: body === undefined ? null : JSON.stringify(body)
    })

  const auth = (path: string, body: unknown, cookie = '') => request('POST', `/api/auth${path}`, cookie, body)

  const cookieOf = (response: Response) =>
    response.headers
      .getSetCookie()
      .map((cookie) => cookie.split(';')[0])
      .join('; ')

  /** A confirmed account, signed in. */
  async function account() {
    const address = `payer-${++lastAccount}@example.com`
    await auth('/sign-up/email', { name: `Payer ${lastAccount}`, email: address, password, locale: 'en' })
    await jobs.worker.drain()
    const message = email.sent.findLast((sent) => sent.to === address)
    const confirm = new URL(message?.text.match(/https?:\/\/\S+/)?.[0] ?? '')
    await request('GET', confirm.pathname + confirm.search)
    return { email: address, cookie: cookieOf(await auth('/sign-in/email', { email: address, password })) }
  }

  /** An organization of a new owner, on trial since now. */
  async function organization() {
    const owner = await account()
    const created = await auth(
      '/organization/create',
      { name: 'Acme', slug: `acme-${lastAccount}`, timeZone: 'America/Sao_Paulo', currency: 'BRL' },
      owner.cookie
    )
    const { id } = (await created.json()) as { id: string }
    const base = `/api/organizations/${id}`
    const billingRoute = (method: string, path = '', body?: unknown) =>
      request(method, `${base}/billing${path}`, owner.cookie, body)
    return {
      id,
      owner,
      membership: async () =>
        organizationMembershipSchema.parse(await (await request('GET', `${base}/me`, owner.cookie)).json()),
      read: async () => billingSchema.parse(await (await billingRoute('GET')).json()),
      // Each of the owner's choices a second later, so the trail orders by time.
      checkout: (plan: 'basic' | 'pro', version: number) => {
        clock.advance(1000)
        return billingRoute('POST', '/checkout', { plan, method: 'card', version, returnTo })
      },
      choose: (plan: 'basic' | 'pro', version: number) => {
        clock.advance(1000)
        return billingRoute('PUT', '/plan', { plan, version })
      },
      billingRoute,
      /** A command to the fake a second later, through the real webhook route, then the jobs it enqueued. */
      command: async (command: string, eventId?: string) => {
        clock.advance(1000)
        const response = await request(
          'POST',
          '/api/webhooks/fake',
          '',
          { command, organizationId: id, eventId },
          {
            'fake-billing-token': token
          }
        )
        await jobs.worker.drain()
        return response
      },
      /** The subscription's audit trail, oldest first, from the table: a plan without the activity log cannot read it. */
      activity: async () =>
        (
          await sql<{ action: string }>`
            select action from audit_entry
            where organization_id = ${id} and resource_type = 'subscription'
            order by at, id
          `.execute(db)
        ).rows.map((row) => row.action),
      createCustomer: (name: string) => request('POST', `${base}/customers`, owner.cookie, { name })
    }
  }

  /** An organization that subscribed to `plan` through the fake, now. */
  async function subscribed(plan: 'basic' | 'pro' = 'basic') {
    const org = await organization()
    await org.checkout(plan, 0)
    await org.command('checkout.complete')
    return org
  }

  it('activates an organization once its first checkout completes at the provider', async () => {
    const org = await organization()
    expect((await org.membership()).subscription).toMatchObject({ status: 'trialing', access: 'full' })

    const opened = await org.checkout('pro', 0)
    expect(billingPageSchema.parse(await opened.json())).toEqual({ url: `${webOrigin}${returnTo}?checkout=returned` })
    expect((await org.membership()).subscription).toMatchObject({ status: 'trialing', checkout: { plan: 'pro' } })

    expect((await org.command('checkout.complete')).status).toBe(200)

    expect(await org.membership()).toMatchObject({
      subscription: { status: 'active', access: 'full', plan: 'pro', checkout: null },
      entitlements: plans.pro.entitlements
    })
    expect(await org.activity()).toEqual(['checkout-started', 'activated'])
  })

  it('completes a checkout by itself in development, through the same inbox and job', async () => {
    const org = await organization()
    await org.checkout('basic', 0)

    development.advance(3_000)
    await vi.waitFor(async () => {
      await jobs.worker.drain()
      expect((await org.membership()).subscription).toMatchObject({ status: 'active', plan: 'basic' })
    })
  })

  it('goes past due on a failed payment, read only after the grace period, and active again on recovery', async () => {
    const org = await subscribed()

    await org.command('payment.fail')
    expect((await org.membership()).subscription).toMatchObject({ status: 'past_due', access: 'full' })

    clock.advance(gracePeriod.days * day)
    expect((await org.membership()).subscription).toMatchObject({ status: 'past_due', access: 'read-only' })
    const refused = await org.createCustomer('Ada')
    expect(refused.status).toBe(403)
    expect(((await refused.json()) as { code: string }).code).toBe('subscription_read_only')
    // Paying still works while read only.
    expect((await org.billingRoute('GET', '/payment-page')).status).toBe(200)

    await org.command('payment.recover')

    expect((await org.membership()).subscription).toMatchObject({
      status: 'active',
      access: 'full',
      pastDueSince: null
    })
    expect((await org.createCustomer('Ada')).status).toBe(201)
    expect(await org.activity()).toEqual(['checkout-started', 'activated', 'payment-failed', 'payment-recovered'])
  })

  it('takes a repeated notice in once: the second changes nothing and enqueues nothing', async () => {
    const org = await subscribed()
    const queued = async () =>
      Number(
        (await sql<{ n: string }>`select count(*) as n from job where kind = 'billing.sync-subscription'`.execute(db))
          .rows[0]?.n
      )
    const before = await queued()

    const first = await org.command('payment.fail', `evt_repeat_${org.id}`)
    const repeat = await org.command('payment.fail', `evt_repeat_${org.id}`)

    expect([first.status, repeat.status]).toEqual([200, 200])
    expect(await queued()).toBe(before + 1)
    expect(await org.activity()).toEqual(['checkout-started', 'activated', 'payment-failed'])
  })

  it('refuses a forged or missing token with a 401, before any statement reaches the database', async () => {
    const org = await subscribed()
    const at = statements

    const forged = await request(
      'POST',
      '/api/webhooks/fake',
      '',
      { command: 'subscription.cancel', organizationId: org.id },
      {
        'fake-billing-token': 'guess'
      }
    )
    const missing = await request('POST', '/api/webhooks/fake', '', {
      command: 'subscription.cancel',
      organizationId: org.id
    })

    expect([forged.status, missing.status]).toEqual([401, 401])
    expect(statements).toBe(at)
    expect((await org.membership()).subscription.status).toBe('active')
  })

  /** Moves the clock to `days` before the end of the period paid for, and reads the plan page there. */
  const daysBeforeTheEnd = async (org: Awaited<ReturnType<typeof organization>>, days: number) => {
    const { subscription } = await org.read()
    clock.advance(Date.parse(subscription.paidThrough as string) - clock.now().getTime() - days * day)
    return org.read()
  }

  it('charges an upgrade the difference for the days left, and applies it once paid', async () => {
    const org = await subscribed('basic')
    const { version, subscription } = await daysBeforeTheEnd(org, 12)
    const periodStartsAt = new Date(subscription.periodStartsAt as string)
    const paidThrough = new Date(subscription.paidThrough as string)
    const due = prorateUpgrade({ from: 'basic', to: 'pro', periodStartsAt, paidThrough, now: clock.now() })

    await org.checkout('pro', version)

    expect(due.amount).toBe(
      Math.floor((5000 * 12) / Math.round((paidThrough.getTime() - periodStartsAt.getTime()) / day))
    )
    expect((await org.read()).subscription.checkout).toEqual({ kind: 'upgrade', plan: 'pro', amount: due })
    expect((await org.membership()).subscription.plan).toBe('basic')
    await org.command('checkout.complete')
    expect((await org.membership()).subscription).toMatchObject({ plan: 'pro', checkout: null })
    expect(await org.activity()).toEqual(['checkout-started', 'activated', 'upgrade-started', 'plan-changed'])
  })

  it("makes an upgrade free and immediate below the provider's minimum charge: 2 days left", async () => {
    const org = await subscribed('basic')
    const { version } = await daysBeforeTheEnd(org, 2)

    const page = billingPageSchema.parse(await (await org.checkout('pro', version)).json())

    expect(page).toEqual({ url: null })
    expect((await org.membership()).subscription).toMatchObject({ plan: 'pro', checkout: null })
    expect(await org.activity()).toEqual(['checkout-started', 'activated', 'plan-changed'])
  })

  it('applies a downgrade at the end of the paid period, and not before', async () => {
    const org = await subscribed('pro')
    const { version } = await org.read()

    expect((await org.choose('basic', version)).status).toBe(204)
    expect((await org.membership()).subscription).toMatchObject({ plan: 'pro', nextPlan: 'basic' })

    clock.advance(30 * day)
    await org.command('period.renew')

    expect(await org.membership()).toMatchObject({
      subscription: { plan: 'basic', nextPlan: null },
      entitlements: plans.basic.entitlements
    })
    expect(await org.activity()).toEqual(['checkout-started', 'activated', 'downgrade-scheduled', 'plan-changed'])
  })

  it('refuses every billing route to a member who is not the owner, an admin included', async () => {
    const org = await organization()
    const admin = await account()
    const invitation = (await (
      await auth(
        '/organization/invite-member',
        { organizationId: org.id, email: admin.email, role: 'admin' },
        org.owner.cookie
      )
    ).json()) as { id: string }
    await auth('/organization/accept-invitation', { invitationId: invitation.id }, admin.cookie)
    const base = `/api/organizations/${org.id}/billing`

    const answers = await Promise.all([
      request('GET', base, admin.cookie),
      request('POST', `${base}/checkout`, admin.cookie, { plan: 'pro', method: 'card', version: 0, returnTo }),
      request('PUT', `${base}/plan`, admin.cookie, { plan: 'basic', version: 0 }),
      request('POST', `${base}/cancel`, admin.cookie, { version: 0 })
    ])

    expect(answers.map((answer) => answer.status)).toEqual([403, 403, 403, 403])
    expect((await org.read()).version).toBe(0)
  })

  it('ends the subscription at the provider once its organization is deleted', async () => {
    const org = await subscribed()
    const { reference } = await org.read()

    await auth('/organization/delete', { organizationId: org.id }, org.owner.cookie)
    await jobs.worker.drain()
    expect(await billing.subscription(reference as string)).toMatchObject({ status: 'active' })
    clock.advance(60_000)
    await jobs.worker.drain()

    expect(await billing.subscription(reference as string)).toMatchObject({ status: 'cancelled' })
  })

  it('ends the subscription of an organization that goes with the account of its only member', async () => {
    const org = await subscribed()
    const { reference } = await org.read()

    await auth('/delete-user', {}, org.owner.cookie)
    await jobs.worker.drain()
    const message = email.sent.findLast((sent) => sent.to === org.owner.email)
    const link = new URL(message?.text.match(/https?:\/\/\S+/)?.[0] ?? '')
    await auth('/delete-user', { token: link.searchParams.get('token') }, org.owner.cookie)
    clock.advance(60_000)
    await jobs.worker.drain()

    expect(await billing.subscription(reference as string)).toMatchObject({ status: 'cancelled' })
  })
})
