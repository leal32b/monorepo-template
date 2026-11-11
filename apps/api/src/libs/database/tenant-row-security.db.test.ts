import { fileURLToPath } from 'node:url'
import { sql } from 'kysely'
import pino from 'pino'
import { inject } from 'vitest'
import { resetDatabase } from '../../../test/reset-database'
import { unprotectedTenantTables } from '../../../test/tenant-tables'
import { createDatabase, createPool } from './database'
import { runMigrations } from './migrations'

const migrations = fileURLToPath(new URL('../../../migrations/', import.meta.url))
const db = createDatabase(createPool(inject('databaseUrl'), pino({ level: 'silent' })))

beforeAll(async () => {
  await resetDatabase(db)
  await runMigrations(db, migrations)
})

afterAll(async () => {
  await sql.raw('drop table if exists forgotten; drop table if exists handed_over').execute(db)
  await db.destroy()
})

describe('the tenant net over the migrated schema (ADR 0055)', () => {
  it('covers every table that names an organization or that the tenant role can touch', async () => {
    // A table listed here is missing the three lines of `0009_tenant_row_security.sql` in its migration.
    expect(await unprotectedTenantTables(db)).toEqual([])
  })

  it('reports a tenant table created without a policy', async () => {
    await sql`create table forgotten (id text primary key, organization_id text not null)`.execute(db)

    expect(await unprotectedTenantTables(db)).toEqual(['public.forgotten'])

    await sql`alter table forgotten enable row level security`.execute(db)
    expect(await unprotectedTenantTables(db)).toEqual(['public.forgotten'])

    await sql
      .raw(
        `create policy tenant_isolation on forgotten to app_tenant using (organization_id = current_setting('app.organization_id', true))`
      )
      .execute(db)
    expect(await unprotectedTenantTables(db)).toEqual([])
  })

  it('reports a table granted to the tenant role without row security, whatever its columns', async () => {
    await sql
      .raw('create table handed_over (id text primary key); grant select on handed_over to app_tenant')
      .execute(db)

    expect(await unprotectedTenantTables(db)).toEqual(['public.handed_over'])
  })

  it('gives the tenant role nothing on the auth schema', async () => {
    const { rows } = await sql<{ reachable: boolean }>`
      select has_schema_privilege('app_tenant', 'auth', 'usage') as reachable
    `.execute(db)

    expect(rows).toEqual([{ reachable: false }])
  })
})
