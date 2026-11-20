import { fileURLToPath } from 'node:url'
import { trial } from '@repo/contracts'
import { sql } from 'kysely'
import pino from 'pino'
import { inject } from 'vitest'
import { FixedClock } from '#libs/adapters/fixed-clock'
import { UuidGenerator } from '#libs/adapters/uuid-generator'
import { createDatabase, createPool } from '#libs/database/database'
import { KyselyJobs } from '#libs/database/kysely-jobs'
import { runMigrations } from '#libs/database/migrations'
import { resetDatabase } from '../../../../test/reset-database'
import { endImpersonationJob } from '../jobs/end-impersonation'
import { kyselyBackOfficeUnitOfWork } from './kysely-back-office-unit-of-work'

const migrations = fileURLToPath(new URL('../../../../migrations/', import.meta.url))
const db = createDatabase(createPool(inject('databaseUrl'), pino({ level: 'silent' })))
const clock = new FixedClock(new Date('2026-11-20T12:00:00Z'))
const unitOfWork = kyselyBackOfficeUnitOfWork(
  db,
  (transaction) => new KyselyJobs(transaction, new UuidGenerator(), clock)
)

beforeAll(async () => {
  await resetDatabase(db)
  await runMigrations(db, migrations)
  await sql
    .raw(`
      insert into auth."user" (id, name, email, "emailVerified", "createdAt", locale, "twoFactorEnabled") values
        ('user-ada', 'Ada', 'ada@example.test', true, '2026-11-01T08:00:00Z', 'en', true),
        ('user-bob', 'Bob', 'bob@100%.test', true, '2026-11-02T08:00:00Z', 'en', false),
        ('user-rex', 'Rex', 'rex@example.test', true, '2026-11-03T08:00:00Z', 'en', true);
      insert into auth."account" (id, "accountId", "providerId", "userId", "createdAt", "updatedAt") values
        ('acc-ada', 'user-ada', 'credential', 'user-ada', now(), now()),
        ('acc-bob', 'g-1', 'google', 'user-bob', now(), now());
      insert into auth."session" (id, "expiresAt", token, "createdAt", "updatedAt", "userId") values
        ('s-1', '2026-12-01', 't-1', '2026-11-10T08:00:00Z', now(), 'user-ada'),
        ('s-2', '2026-12-01', 't-2', '2026-11-12T08:00:00Z', now(), 'user-ada');
      insert into auth."organization" (id, name, slug, "createdAt", "timeZone", currency) values
        ('org-acme', 'Acme', 'acme', '2026-11-01T09:00:00Z', 'America/Sao_Paulo', 'BRL'),
        ('org-beta', 'Beta', 'beta', '2026-11-05T09:00:00Z', 'UTC', 'USD');
      insert into auth."member" (id, "organizationId", "userId", role, "createdAt") values
        ('m-1', 'org-acme', 'user-ada', 'owner', '2026-11-01T09:00:00Z'),
        ('m-2', 'org-acme', 'user-bob', 'member,editor', '2026-11-03T09:00:00Z'),
        ('m-3', 'org-beta', 'user-bob', 'owner', '2026-11-05T09:00:00Z');
      insert into subscription (organization_id, status, plan, trial_ends_at, period_starts_at, paid_through,
          cancel_at_period_end, checkout_kind, checkout_plan, checkout_amount, created_at, updated_at)
        values ('org-acme', 'active', 'basic', '2026-11-15T09:00:00Z', '2026-11-15T09:00:00Z', '2026-12-15T09:00:00Z',
          false, 'upgrade', 'pro', 2000, now(), now());
      insert into operator (id, user_id, granted_at, granted_by, revoked_at, revoked_by) values
        ('op-ada', 'user-ada', '2026-11-10T00:00:00Z', 'test', null, null),
        ('op-bob', 'user-bob', '2026-11-10T00:00:00Z', 'test', null, null),
        ('op-rex', 'user-rex', '2026-11-10T00:00:00Z', 'test', '2026-11-11T00:00:00Z', 'test');
    `)
    .execute(db)
})

afterAll(async () => {
  await db.destroy()
})

describe('kyselyBackOfficeUnitOfWork (ADR 0077)', () => {
  it('reads in a read-only transaction, which refuses a write', async () => {
    await expect(
      unitOfWork.read(({ impersonations }) =>
        impersonations.start({
          id: 'v-x',
          operatorId: 'user-ada',
          organizationId: 'org-acme',
          startedAt: clock.now(),
          expiresAt: clock.now()
        })
      )
    ).rejects.toMatchObject({ code: '25006' })
  })

  it('finds an active operator with what the guard checks, and nobody revoked or never granted', async () => {
    const found = await unitOfWork.read(async ({ operators }) => [
      await operators.find('user-ada'),
      await operators.find('user-bob'),
      await operators.find('user-rex'),
      await operators.find('user-nobody')
    ])

    expect(found).toEqual([
      {
        userId: 'user-ada',
        grantedAt: new Date('2026-11-10T00:00:00Z'),
        twoFactorEnabled: true,
        signsInOtherwise: false
      },
      {
        userId: 'user-bob',
        grantedAt: new Date('2026-11-10T00:00:00Z'),
        twoFactorEnabled: false,
        signsInOtherwise: true
      },
      null,
      null
    ])
  })

  it('lists organizations newest first, with the oldest owner, the members and the subscription, a page at a time', async () => {
    const page = await unitOfWork.read(({ directory }) =>
      directory.organizations({ search: undefined, page: 1, pageSize: 1 })
    )

    expect(page.total).toBe(2)
    expect(page.items).toEqual([
      {
        id: 'org-beta',
        name: 'Beta',
        slug: 'beta',
        createdAt: new Date('2026-11-05T09:00:00Z'),
        subscription: expect.objectContaining({ status: 'trialing', plan: null }),
        owner: { id: 'user-bob', name: 'Bob', email: 'bob@100%.test' },
        members: 1
      }
    ])
    const second = await unitOfWork.read(({ directory }) =>
      directory.organizations({ search: undefined, page: 2, pageSize: 1 })
    )
    expect(second.items[0]).toMatchObject({
      id: 'org-acme',
      owner: { id: 'user-ada' },
      members: 2,
      subscription: { status: 'active', plan: 'basic', checkout: { kind: 'upgrade', plan: 'pro' } }
    })
  })

  it("searches organizations by name, slug or the owner's email, taking the pattern's characters literally", async () => {
    const ids = (search: string) =>
      unitOfWork.read(async ({ directory }) =>
        (await directory.organizations({ search, page: 1, pageSize: 20 })).items.map((item) => item.id)
      )

    expect(await ids('ACM')).toEqual(['org-acme'])
    expect(await ids('eta')).toEqual(['org-beta'])
    expect(await ids('ada@')).toEqual(['org-acme'])
    expect(await ids('100%')).toEqual(['org-beta'])
    expect(await ids('_')).toEqual([])
    expect(
      await unitOfWork.read(({ directory }) => directory.organizations({ search: 'zzz', page: 1, pageSize: 20 }))
    ).toEqual({
      items: [],
      total: 0
    })
  })

  it("reads an organization's page with its settings, members and subscription, or nothing", async () => {
    const page = await unitOfWork.read(({ directory }) => directory.organization('org-acme'))

    expect(page).toMatchObject({
      id: 'org-acme',
      timeZone: 'America/Sao_Paulo',
      currency: 'BRL',
      subscription: { status: 'active' },
      members: [
        {
          id: 'user-ada',
          name: 'Ada',
          email: 'ada@example.test',
          role: 'owner',
          joinedAt: new Date('2026-11-01T09:00:00Z')
        },
        { id: 'user-bob', role: 'member,editor', joinedAt: new Date('2026-11-03T09:00:00Z') }
      ]
    })
    expect((await unitOfWork.read(({ directory }) => directory.organization('org-beta')))?.subscription).toMatchObject({
      status: 'trialing',
      trialEndsAt: new Date(new Date('2026-11-05T09:00:00Z').getTime() + trial.days * 24 * 60 * 60 * 1000)
    })
    expect(await unitOfWork.read(({ directory }) => directory.organization('org-missing'))).toBeNull()
  })

  it('lists users newest first, with the last sign-in, two-step verification and their organizations, searched', async () => {
    const page = await unitOfWork.read(({ directory }) => directory.users({ search: undefined, page: 1, pageSize: 20 }))

    expect(page.total).toBe(3)
    expect(page.items.map((user) => user.id)).toEqual(['user-rex', 'user-bob', 'user-ada'])
    expect(page.items[2]).toEqual({
      id: 'user-ada',
      name: 'Ada',
      email: 'ada@example.test',
      createdAt: new Date('2026-11-01T08:00:00Z'),
      lastSignInAt: new Date('2026-11-12T08:00:00Z'),
      twoFactor: true,
      organizations: [{ id: 'org-acme', name: 'Acme', slug: 'acme', role: 'owner' }]
    })
    expect(page.items[1]?.organizations.map((organization) => organization.id)).toEqual(['org-acme', 'org-beta'])
    expect(page.items[0]).toMatchObject({ lastSignInAt: null, organizations: [] })
    const found = await unitOfWork.read(({ directory }) => directory.users({ search: 'BOB', page: 1, pageSize: 20 }))
    expect(found).toMatchObject({ total: 1, items: [{ id: 'user-bob' }] })
  })

  it('starts a visit, with its entry and its job, finds it, and ends it once', async () => {
    const startedAt = clock.now()
    const expiresAt = new Date(startedAt.getTime() + 30 * 60 * 1000)
    await unitOfWork.write(async ({ impersonations, audit, jobs }) => {
      await impersonations.start({
        id: 'v-1',
        operatorId: 'user-ada',
        organizationId: 'org-beta',
        startedAt,
        expiresAt
      })
      await audit.record({
        id: 'a-1',
        organizationId: 'org-beta',
        at: startedAt,
        actor: { kind: 'operator', id: 'user-ada' },
        resourceType: 'organization',
        resourceId: 'org-beta',
        action: 'impersonation-started',
        fields: []
      })
      await jobs.enqueue(endImpersonationJob, { impersonationId: 'v-1' }, { runAt: expiresAt })
    })
    const { rows: queued } = await sql<{ kind: string; run_at: Date }>`select kind, run_at from job`.execute(db)
    expect(queued).toEqual([{ kind: 'back-office.end-impersonation', run_at: expiresAt }])

    expect(await unitOfWork.read(({ impersonations }) => impersonations.active('user-ada'))).toEqual({
      id: 'v-1',
      operatorId: 'user-ada',
      organization: { id: 'org-beta', name: 'Beta', slug: 'beta' },
      startedAt,
      expiresAt
    })
    expect(await unitOfWork.write(({ impersonations }) => impersonations.end('v-1', clock.now(), 'left'))).toEqual({
      organizationId: 'org-beta',
      operatorId: 'user-ada'
    })
    expect(await unitOfWork.write(({ impersonations }) => impersonations.end('v-1', clock.now(), 'expired'))).toBeNull()
    expect(await unitOfWork.read(({ impersonations }) => impersonations.active('user-ada'))).toBeNull()
  })
})
