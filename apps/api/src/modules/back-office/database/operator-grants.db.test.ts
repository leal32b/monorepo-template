import { fileURLToPath } from 'node:url'
import { sql } from 'kysely'
import pino from 'pino'
import { inject } from 'vitest'
import { FixedClock } from '#libs/adapters/fixed-clock'
import { UuidGenerator } from '#libs/adapters/uuid-generator'
import { createDatabase, createPool } from '#libs/database/database'
import { KyselyJobs } from '#libs/database/kysely-jobs'
import { runMigrations } from '#libs/database/migrations'
import { resetDatabase } from '../../../../test/reset-database'
import { StartImpersonationService } from '../commands/start-impersonation/start-impersonation.service'
import { kyselyBackOfficeUnitOfWork } from './kysely-back-office-unit-of-work'
import { OperatorGrants } from './operator-grants'

const migrations = fileURLToPath(new URL('../../../../migrations/', import.meta.url))
const db = createDatabase(createPool(inject('databaseUrl'), pino({ level: 'silent' })))
const clock = new FixedClock(new Date('2026-11-20T12:00:00Z'))
const ids = new UuidGenerator()
const unitOfWork = kyselyBackOfficeUnitOfWork(db, (transaction) => new KyselyJobs(transaction, ids, clock))
const grants = new OperatorGrants(db, { unitOfWork, ids, clock })

beforeAll(async () => {
  await resetDatabase(db)
  await runMigrations(db, migrations)
  await sql
    .raw(`
      insert into auth."user" (id, name, email, "emailVerified", locale, "twoFactorEnabled") values
        ('user-otto', 'Otto', 'otto@example.test', true, 'en', true),
        ('user-new', 'New', 'new@example.test', false, 'en', true),
        ('user-open', 'Open', 'open@example.test', true, 'en', false),
        ('user-goog', 'Goog', 'goog@example.test', true, 'en', true);
      insert into auth."account" (id, "accountId", "providerId", "userId", "createdAt", "updatedAt") values
        ('acc-goog', 'g-1', 'google', 'user-goog', now(), now());
      insert into auth."organization" (id, name, slug, "createdAt", "timeZone", currency)
        values ('org-acme', 'Acme', 'acme', now(), 'UTC', 'USD');
    `)
    .execute(db)
})

afterAll(async () => {
  await db.destroy()
})

describe('OperatorGrants (ADR 0077)', () => {
  it('refuses an account that could sign in without a second factor, or none', async () => {
    expect(await grants.grant('nobody@example.test', 'owner')).toEqual({ granted: false, refusal: 'no-account' })
    expect(await grants.grant('new@example.test', 'owner')).toEqual({ granted: false, refusal: 'email-not-confirmed' })
    expect(await grants.grant('open@example.test', 'owner')).toEqual({ granted: false, refusal: 'two-factor-off' })
    expect(await grants.grant('goog@example.test', 'owner')).toEqual({ granted: false, refusal: 'other-sign-in' })
  })

  it('grants, once, whatever the case of the address', async () => {
    expect(await grants.grant('Otto@Example.test', 'Fernando')).toEqual({ granted: true })
    expect(await grants.grant('otto@example.test', 'Fernando')).toEqual({ granted: false, refusal: 'already-operator' })
    expect(await grants.list()).toEqual([
      { email: 'otto@example.test', grantedAt: clock.now(), grantedBy: 'Fernando', revokedAt: null, revokedBy: null }
    ])
  })

  it('revokes, ending the visit with its entry in the trail, and keeps the record', async () => {
    await new StartImpersonationService(unitOfWork, ids, clock).execute('user-otto', 'org-acme')

    expect(await grants.revoke('otto@example.test', 'Fernando')).toBe(true)
    expect(await grants.revoke('otto@example.test', 'Fernando')).toBe(false)

    const { rows } = await sql<{ end_reason: string }>`select end_reason from impersonation`.execute(db)
    expect(rows).toEqual([{ end_reason: 'revoked' }])
    const { rows: trail } = await sql<{ action: string }>`select action from audit_entry order by at, action`.execute(
      db
    )
    expect(trail.map((entry) => entry.action).sort()).toEqual(['impersonation-ended', 'impersonation-started'])
    expect(await grants.list()).toMatchObject([{ email: 'otto@example.test', revokedBy: 'Fernando' }])
    expect(await grants.grant('otto@example.test', 'Fernando')).toEqual({ granted: true })
    expect(await grants.list()).toHaveLength(2)
  })

  it('revokes an operator who is inside no organization', async () => {
    expect(await grants.revoke('otto@example.test', 'Fernando')).toBe(true)
  })
})
