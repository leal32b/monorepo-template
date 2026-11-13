import { fileURLToPath } from 'node:url'
import { plans, trial } from '@repo/contracts'
import { type KyselyPlugin, sql } from 'kysely'
import pino from 'pino'
import { inject } from 'vitest'
import { FixedClock } from '#libs/adapters/fixed-clock'
import { createDatabase, createPool } from '#libs/database/database'
import { runMigrations } from '#libs/database/migrations'
import { resetDatabase } from '../../../../test/reset-database'
import { KyselyMembership } from './kysely-membership'

const migrations = fileURLToPath(new URL('../../../../migrations/', import.meta.url))
const day = 24 * 60 * 60 * 1000
const created = new Date('2026-11-01T09:00:00Z')

describe('KyselyMembership (ADR 0033)', () => {
  const db = createDatabase(createPool(inject('databaseUrl'), pino({ level: 'silent' })))
  const clock = new FixedClock(new Date('2026-11-10T09:00:00Z'))
  const membership = new KyselyMembership(db, clock)

  beforeAll(async () => {
    await resetDatabase(db)
    await runMigrations(db, migrations)
    await sql`insert into auth."user" (id, name, email, "emailVerified", "createdAt", "updatedAt", locale)
      values ('user-ada', 'Ada', 'ada@example.com', true, now(), now(), 'en'),
             ('user-bob', 'Bob', 'bob@example.com', true, now(), now(), 'en')`.execute(db)
    await sql`insert into auth.organization (id, name, slug, "createdAt")
      values ('org-acme', 'Acme', 'acme', ${created}), ('org-other', 'Other', 'other', now()),
             ('org-paid', 'Paid', 'paid', ${created}), ('org-late', 'Late', 'late', ${created})`.execute(db)
    await sql`insert into auth."organizationRole" (id, "organizationId", role, permission)
      values ('role-editor', 'org-acme', 'editor', '{"invitation":["create"],"ac":["update"]}'),
             ('role-elsewhere', 'org-other', 'editor', '{"organization":["update"]}')`.execute(db)
    await sql`insert into auth.member (id, "organizationId", "userId", role, "createdAt")
      values ('member-ada', 'org-acme', 'user-ada', 'member,editor', now()),
             ('member-bob', 'org-other', 'user-bob', 'owner', now()),
             ('member-ada-paid', 'org-paid', 'user-ada', 'owner', now()),
             ('member-ada-late', 'org-late', 'user-ada', 'owner', now())`.execute(db)
    await sql`insert into subscription (organization_id, status, plan, next_plan, trial_ends_at, period_starts_at,
        paid_through, past_due_since, cancel_at_period_end, checkout_kind, checkout_plan, checkout_amount, created_at, updated_at)
      values ('org-paid', 'active', 'basic', null, '2026-11-15T09:00:00Z', '2026-11-05T00:00:00Z', '2026-12-05T00:00:00Z',
        null, true, 'upgrade', 'pro', 2000, now(), now()),
      ('org-late', 'past_due', 'pro', 'basic', '2026-11-15T09:00:00Z', '2026-10-05T00:00:00Z', '2026-11-05T00:00:00Z',
        '2026-10-20T00:00:00Z', false, null, null, null, now(), now())`.execute(db)
  })

  afterAll(async () => {
    await db.destroy()
  })

  it('resolves built-in and custom roles of the organization into one set of permissions', async () => {
    expect(await membership.memberOf('org-acme', 'user-ada')).toMatchObject({
      userId: 'user-ada',
      organizationId: 'org-acme',
      roles: ['member', 'editor'],
      permissions: { ac: ['read', 'update'], customer: ['read', 'create', 'update'], invitation: ['create'] }
    })
  })

  it('reads an organization without a subscription as on trial since its creation, read only once it ends (ADR 0063)', async () => {
    const member = await membership.memberOf('org-acme', 'user-ada')

    expect(member?.subscription).toEqual({
      status: 'trialing',
      access: 'full',
      plan: null,
      nextPlan: null,
      trialEndsAt: new Date(created.getTime() + trial.days * day),
      periodStartsAt: null,
      paidThrough: null,
      pastDueSince: null,
      cancelAtPeriodEnd: false,
      checkout: null
    })
    expect(member?.entitlements).toBe(trial.entitlements)
    const later = new KyselyMembership(db, new FixedClock(new Date(created.getTime() + trial.days * day)))
    expect((await later.memberOf('org-acme', 'user-ada'))?.subscription.access).toBe('read-only')
  })

  it("reads the organization's subscription, what it lets members do by the API's clock, and what its plan grants", async () => {
    const member = await membership.memberOf('org-paid', 'user-ada')

    expect(member?.subscription).toEqual({
      status: 'active',
      access: 'full',
      plan: 'basic',
      nextPlan: null,
      trialEndsAt: new Date('2026-11-15T09:00:00Z'),
      periodStartsAt: new Date('2026-11-05T00:00:00Z'),
      paidThrough: new Date('2026-12-05T00:00:00Z'),
      pastDueSince: null,
      cancelAtPeriodEnd: true,
      checkout: { kind: 'upgrade', plan: 'pro', amount: { amount: 2000, currency: 'BRL' } }
    })
    expect(member?.entitlements).toBe(plans.basic.entitlements)
    const ended = new KyselyMembership(db, new FixedClock(new Date('2026-12-05T00:00:00Z')))
    expect((await ended.memberOf('org-paid', 'user-ada'))?.subscription.access).toBe('read-only')
  })

  it('names the members of the organization among the ids asked for, and nobody else (ADR 0061)', async () => {
    const names = await membership.namesOf('org-acme', ['user-ada', 'user-bob', 'user-gone'])

    expect(names).toEqual(new Map([['user-ada', 'Ada']]))
    expect(await membership.namesOf('org-acme', [])).toEqual(new Map())
  })

  it('reads a late payment as read only once the grace period from its due date is over', async () => {
    const member = await membership.memberOf('org-late', 'user-ada')

    expect(member?.subscription).toMatchObject({
      status: 'past_due',
      access: 'read-only',
      plan: 'pro',
      nextPlan: 'basic',
      pastDueSince: new Date('2026-10-20T00:00:00Z'),
      checkout: null
    })
    expect(member?.entitlements).toBe(plans.pro.entitlements)
  })

  it('finds nobody in an organization the user is not in, nor in one that does not exist', async () => {
    expect(await membership.memberOf('org-other', 'user-ada')).toBeNull()
    expect(await membership.memberOf('org-missing', 'user-ada')).toBeNull()
  })

  it('reads a member, the custom roles and the subscription in one round trip, as it reads a non-member', async () => {
    let queries = 0
    const counter: KyselyPlugin = {
      transformQuery: ({ node }) => {
        queries += 1
        return node
      },
      transformResult: async ({ result }) => result
    }
    const counted = new KyselyMembership(db.withPlugin(counter), clock)

    await counted.memberOf('org-acme', 'user-ada')
    expect(queries).toBe(1)
    await counted.memberOf('org-paid', 'user-ada')
    expect(queries).toBe(2)
    await counted.memberOf('org-other', 'user-ada')
    expect(queries).toBe(3)
  })
})
