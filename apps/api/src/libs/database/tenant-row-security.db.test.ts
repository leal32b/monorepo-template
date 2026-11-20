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
  await sql
    .raw('drop table if exists forgotten; drop table if exists handed_over; drop table if exists out_of_reach')
    .execute(db)
  await db.destroy()
})

describe('the tenant net over the migrated schema (ADR 0055)', () => {
  it('covers every table that names an organization or that the tenant role can touch', async () => {
    // A table listed here is missing the three lines of `0009_tenant_row_security.sql` in its migration.
    expect(await unprotectedTenantTables(db)).toEqual([])
  })

  it('reports a tenant table created without a policy', async () => {
    await sql
      .raw(
        'create table forgotten (id text primary key, organization_id text not null); grant select, insert on forgotten to app_tenant'
      )
      .execute(db)

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

  it('leaves out a table that names an organization when row security is on and the tenant role holds nothing on it', async () => {
    // It cannot reach it at all; a policy for it would be a grant waiting to be added (ADR 0077).
    await sql`create table out_of_reach (id text primary key, organization_id text not null)`.execute(db)
    expect(await unprotectedTenantTables(db)).toContain('public.out_of_reach')

    await sql`alter table out_of_reach enable row level security`.execute(db)
    expect(await unprotectedTenantTables(db)).not.toContain('public.out_of_reach')
  })

  it("gives the tenant role nothing of the back office's tables (ADR 0077)", async () => {
    const { rows } = await sql<{ name: string; reachable: boolean }>`
      select name, has_table_privilege('app_tenant', name, 'select, insert, update, delete, truncate') as reachable
      from unnest(array['operator', 'impersonation']) as name
    `.execute(db)

    expect(rows).toEqual([
      { name: 'operator', reachable: false },
      { name: 'impersonation', reachable: false }
    ])
  })

  it('gives the tenant role nothing on the auth schema', async () => {
    const { rows } = await sql<{ reachable: boolean }>`
      select has_schema_privilege('app_tenant', 'auth', 'usage') as reachable
    `.execute(db)

    expect(rows).toEqual([{ reachable: false }])
  })
})
