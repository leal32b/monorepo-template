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
import { KyselyOrganizationDirectory } from '../infrastructure/kysely-organization-directory'
import { newExport } from '../organization-export'
import { exportRepositoryContract } from '../testing/export-repository.contract'
import { notExported, pluginTables, tenantTables } from './export-tables'
import { kyselyDataExportUnitOfWork } from './kysely-data-export-unit-of-work'

const migrations = fileURLToPath(new URL('../../../../migrations/', import.meta.url))
const db = createDatabase(createPool(inject('databaseUrl'), pino({ level: 'silent' })))
const clock = new FixedClock(new Date('2026-11-19T12:00:00.000Z'))
const unitOfWork = kyselyDataExportUnitOfWork(
  db,
  (transaction) => new KyselyJobs(transaction, new UuidGenerator(), clock)
)

/** An organization with an owner, a member, an invitation, a role, a customer, an entry and a subscription. */
async function seed(id: string) {
  await sql`insert into auth.organization (id, name, slug, "createdAt", "timeZone", currency)
    values (${id}, ${`Org ${id}`}, ${id}, now(), 'America/Sao_Paulo', 'BRL')`.execute(db)
  for (const [user, role, locale] of [
    [`${id}-owner`, 'owner', 'es'],
    [`${id}-member`, 'member', 'en']
  ]) {
    await sql`insert into auth."user" (id, name, email, "emailVerified", locale)
      values (${user}, ${`Name ${user}`}, ${`${user}@example.com`}, true, ${locale})`.execute(db)
    await sql`insert into auth.account (id, "accountId", "providerId", "userId", password, "updatedAt")
      values (${`${user}-account`}, ${user}, 'credential', ${user}, 'argon2-secret-hash', now())`.execute(db)
    await sql`insert into auth.member (id, "organizationId", "userId", role, "createdAt")
      values (${`${user}-m`}, ${id}, ${user}, ${role}, now())`.execute(db)
  }
  await sql`insert into auth.invitation (id, "organizationId", email, role, status, "expiresAt", "inviterId")
    values (${`${id}-inv`}, ${id}, ${`guest-${id}@example.com`}, 'member', 'pending', now(), ${`${id}-owner`})`.execute(
    db
  )
  await sql`insert into auth."organizationRole" (id, "organizationId", role, permission)
    values (${`${id}-role`}, ${id}, 'support', '{"customer":["read"]}')`.execute(db)
  await sql`insert into customer (id, organization_id, name, email, created_at, updated_at, version)
    values (${`${id}-c`}, ${id}, ${`=Customer of ${id}`}, null, now(), now(), 1)`.execute(db)
  await sql`insert into audit_entry (id, organization_id, at, actor_kind, actor_id, resource_type, resource_id, action, fields)
    values (${`${id}-e`}, ${id}, now(), 'member', ${`${id}-owner`}, 'customer', ${`${id}-c`}, 'updated', '{name,email}')`.execute(
    db
  )
  await sql`insert into subscription (organization_id, status, trial_ends_at, provider, provider_customer_id, checkout_url, created_at, updated_at)
    values (${id}, 'trialing', now(), 'asaas', ${`cus-${id}`}, 'https://pay.example.com/secret', now(), now())`.execute(
    db
  )
}

beforeAll(async () => {
  await resetDatabase(db)
  await runMigrations(db, migrations)
  await seed('org-1')
  await seed('org-2')
})

afterAll(async () => {
  await db.destroy()
})

exportRepositoryContract(async () => {
  await sql`truncate organization_export`.execute(db)
  return { run: (organizationId, work) => unitOfWork.run(organizationId, ({ exports }) => work(exports)) }
})

describe('what the export holds (ADR 0074)', () => {
  const directory = new KyselyOrganizationDirectory(db)
  const everything = async (organizationId: string) => {
    const plugin = await directory.read(organizationId, `${organizationId}-owner`)
    const tenant = await unitOfWork.run(organizationId, ({ records }) => records.tables(organizationId))
    return [...(plugin?.tables ?? []), ...tenant]
  }

  it("holds one file per table, with the organization's rows and the columns it names", async () => {
    const tables = Object.fromEntries((await everything('org-1')).map((table) => [table.name, table]))

    expect(Object.keys(tables)).toEqual([
      'organization',
      'members',
      'invitations',
      'roles',
      'customers',
      'activity',
      'subscription'
    ])
    expect(tables.members?.columns).toEqual(['id', 'user_id', 'role', 'created_at', 'name', 'email'])
    expect(tables.members?.rows.map((row) => row.slice(-2))).toEqual([
      ['Name org-1-owner', 'org-1-owner@example.com'],
      ['Name org-1-member', 'org-1-member@example.com']
    ])
    expect(tables.organization?.rows[0]?.slice(0, 5)).toEqual([
      'org-1',
      'Org org-1',
      'org-1',
      'America/Sao_Paulo',
      'BRL'
    ])
    expect(tables.activity?.rows[0]).toContain('name, email')
    expect(tables.customers?.rows[0]?.[1]).toBe('=Customer of org-1')
    expect(tables.subscription?.columns[0]).toBe('status')
  })

  it("holds none of another organization's rows, and no secret (T58)", async () => {
    const text = JSON.stringify(await everything('org-1'))

    expect(text).not.toContain('org-2')
    for (const secret of ['argon2-secret-hash', 'cus-org-1', 'pay.example.com', 'asaas', '"es"']) {
      expect(text).not.toContain(secret)
    }
  })

  it('names the organization and the owner who asked, while still an owner, in their language', async () => {
    expect(await directory.read('org-1', 'org-1-owner')).toMatchObject({
      organization: { name: 'Org org-1', slug: 'org-1', timeZone: 'America/Sao_Paulo' },
      requester: { email: 'org-1-owner@example.com', locale: 'es' }
    })
    expect((await directory.read('org-1', 'org-1-member'))?.requester).toBeNull()
    expect(await directory.read('org-gone', 'org-1-owner')).toBeNull()
  })

  it('names every column of every tenant table and of the organization’s plugin tables, held or left out with why', async () => {
    const { rows } = await sql<{ schema: string; table: string; column: string }>`
      select table_schema as schema, table_name as table, column_name as column from information_schema.columns
      where (table_schema = 'public' and table_name in (
               select table_name from information_schema.columns
               where table_schema = 'public' and column_name = 'organization_id'))
         or (table_schema = 'auth' and table_name in (
               select table_name from information_schema.columns
               where table_schema = 'auth' and column_name = 'organizationId'))
         or (table_schema = 'auth' and table_name = 'organization')
      order by 1, 2, 3
    `.execute(db)
    const specs = [
      ...pluginTables.map((spec) => ['auth', spec] as const),
      ...tenantTables.map((spec) => ['public', spec] as const)
    ]
    const named = new Set(
      specs.flatMap(([schema, spec]) =>
        [...spec.columns, ...Object.keys(spec.leftOut)].map((column) => `${schema}.${spec.table}.${column}`)
      )
    )
    const found = rows
      .filter((row) => !(row.schema === 'public' && row.table in notExported))
      .map((row) => `${row.schema}.${row.table}.${row.column}`)

    expect(found.filter((column) => !named.has(column))).toEqual([])
    expect([...named].filter((column) => !found.includes(column))).toEqual([])
  })
})

describe('organization_export (ADR 0074)', () => {
  it('goes with its organization', async () => {
    await sql`insert into auth.organization (id, name, slug, "createdAt") values ('org-x', 'X', 'org-x', now())`.execute(
      db
    )
    await unitOfWork.run('org-x', ({ exports }) =>
      exports.replace(newExport({ id: 'x', organizationId: 'org-x', requestedBy: 'u', now: clock.now() }))
    )

    await sql`delete from auth.organization where id = 'org-x'`.execute(db)

    expect(await unitOfWork.run('org-x', ({ exports }) => exports.find('org-x'))).toBeNull()
  })
})
