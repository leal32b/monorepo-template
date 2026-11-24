import { fileURLToPath } from 'node:url'
import { type Kysely, sql } from 'kysely'
import pino from 'pino'
import { inject } from 'vitest'
import { createDatabase, createPool } from '#libs/database/database'
import { runMigrations } from '#libs/database/migrations'
import { resetDatabase } from '../../../../test/reset-database'

const migrations = fileURLToPath(new URL('../../../../migrations/', import.meta.url))
const db = createDatabase(createPool(inject('databaseUrl'), pino({ level: 'silent' })))

/** Runs `statement` as the back office's role, in a transaction that is rolled back whatever happens. */
async function asOperator(statement: string): Promise<unknown[]> {
  let rows: unknown[] = []
  await db
    .transaction()
    .execute(async (transaction: Kysely<unknown>) => {
      await sql`select set_config('role', 'app_operator', true)`.execute(transaction)
      rows = (await sql.raw(statement).execute(transaction)).rows
      throw new Rollback()
    })
    .catch((error: unknown) => {
      if (!(error instanceof Rollback)) throw error
    })
  return rows
}
class Rollback extends Error {}

const refused = (statement: string) => expect(asOperator(statement)).rejects.toMatchObject({ code: '42501' })

beforeAll(async () => {
  await resetDatabase(db)
  await runMigrations(db, migrations)
  await sql
    .raw(`
      insert into auth."user" (id, name, email, "emailVerified", locale) values ('u-1', 'Ada', 'ada@example.test', true, 'en');
      insert into auth."organization" (id, name, slug, "createdAt", "timeZone", currency)
        values ('org-1', 'Acme', 'acme', now(), 'UTC', 'USD');
      insert into auth."session" (id, "expiresAt", token, "updatedAt", "userId") values ('s-1', now() + interval '1 day', 'secret-token', now(), 'u-1');
    `)
    .execute(db)
})

afterAll(async () => {
  await db.destroy()
})

describe('the back office role over the migrated schema (ADR 0077)', () => {
  it('reads the columns its screens name', async () => {
    expect(await asOperator('select id, name, slug from auth."organization"')).toEqual([
      { id: 'org-1', name: 'Acme', slug: 'acme' }
    ])
    expect(await asOperator('select "userId", "createdAt" is not null as dated from auth."session"')).toEqual([
      { userId: 'u-1', dated: true }
    ])
    expect(await asOperator('select id, email, "twoFactorEnabled" from auth."user"')).toEqual([
      { id: 'u-1', email: 'ada@example.test', twoFactorEnabled: false }
    ])
    expect(await asOperator('select count(*)::int as rows from subscription')).toEqual([{ rows: 0 }])
  })

  it('reads no secret: a session token, a password, a TOTP secret, a verification', async () => {
    await refused('select token from auth."session"')
    await refused('select password from auth."account"')
    await refused('select secret from auth."twoFactor"')
    await refused('select value from auth."verification"')
    await refused('select logo from auth."organization"')
  })

  it("reads no tenant's records", async () => {
    await refused('select id from customer')
    await refused('select id from audit_entry')
    await refused('select organization_id from organization_logo')
  })

  it('cannot make anyone an operator, nor change an organization', async () => {
    await refused(`insert into operator (id, user_id, granted_at, granted_by) values ('o-1', 'u-1', now(), 'me')`)
    await refused(`update auth."organization" set name = 'Mine'`)
    await refused(`delete from auth."user"`)
  })

  it('records in an organization only its own two entries, as an operator', async () => {
    await expect(
      asOperator(`
        insert into audit_entry (id, organization_id, at, actor_kind, actor_id, resource_type, resource_id, action)
        values ('a-1', 'org-1', now(), 'operator', 'u-1', 'organization', 'org-1', 'impersonation-started')
      `)
    ).resolves.toEqual([])
    await expect(
      asOperator(`
        insert into audit_entry (id, organization_id, at, actor_kind, actor_id, resource_type, resource_id, action)
        values ('a-2', 'org-1', now(), 'member', 'u-1', 'customer', 'c-1', 'deleted')
      `)
    ).rejects.toMatchObject({ code: '42501' })
  })

  it('starts and ends an impersonation, and enqueues only the job that ends one', async () => {
    await expect(
      asOperator(`
        insert into impersonation (id, operator_id, organization_id, started_at, expires_at)
        values ('i-1', 'u-1', 'org-1', now(), now() + interval '30 minutes');
        update impersonation set ended_at = now(), end_reason = 'left' where id = 'i-1';
        insert into job (id, kind, payload, run_at, created_at) values ('j-1', 'back-office.end-impersonation', '{}', now(), now());
      `)
    ).resolves.toEqual([])
    await expect(
      asOperator(
        `insert into job (id, kind, payload, run_at, created_at) values ('j-2', 'identity.send-email', '{}', now(), now())`
      )
    ).rejects.toMatchObject({ code: '42501' })
  })

  it('accepts one active impersonation per operator', async () => {
    await expect(
      asOperator(`
        insert into impersonation (id, operator_id, organization_id, started_at, expires_at)
        values ('i-1', 'u-1', 'org-1', now(), now() + interval '30 minutes'),
               ('i-2', 'u-1', 'org-1', now(), now() + interval '30 minutes');
      `)
    ).rejects.toMatchObject({ code: '23505' })
  })
})
