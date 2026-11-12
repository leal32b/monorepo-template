import { fileURLToPath } from 'node:url'
import { sql } from 'kysely'
import pino from 'pino'
import { inject } from 'vitest'
import { anEntry, auditDay, auditOrganizations, describeAuditTrail } from '#libs/audit/testing/audit-trail.contract'
import { resetDatabase } from '../../../test/reset-database'
import { createDatabase, createPool } from './database'
import { auditRetention, KyselyAuditTrail, purgeAuditEntries } from './kysely-audit-trail'
import { KyselyUnitOfWork } from './kysely-unit-of-work'
import { runMigrations } from './migrations'

const migrations = fileURLToPath(new URL('../../../migrations/', import.meta.url))
const db = createDatabase(createPool(inject('databaseUrl'), pino({ level: 'silent' })))
const days = (n: number) => new Date(auditDay.getTime() + n * 24 * 60 * 60 * 1000)

const createOrganization = (id: string) =>
  sql`insert into auth.organization (id, name, slug, "createdAt") values (${id}, ${id}, ${id}, now())`.execute(db)

beforeAll(async () => {
  await resetDatabase(db)
  await runMigrations(db, migrations)
  for (const id of auditOrganizations) await createOrganization(id)
})

beforeEach(async () => {
  await sql`truncate audit_entry`.execute(db)
})

afterAll(() => db.destroy())

describeAuditTrail('KyselyAuditTrail', async () => new KyselyAuditTrail(db))

describe('KyselyAuditTrail', () => {
  const trail = new KyselyAuditTrail(db)

  it('goes with its organization, and outlives the member who made the change', async () => {
    await createOrganization('org-gone')
    await trail.record(anEntry('e1', { organizationId: 'org-gone' }))
    await trail.record(anEntry('e2', { actor: { kind: 'member', id: 'an-account-deleted-since' } }))

    await sql`delete from auth.organization where id = 'org-gone'`.execute(db)

    expect(await trail.list('org-gone', { limit: 10 })).toEqual([])
    expect((await trail.list('org-1', { limit: 10 })).map((entry) => entry.id)).toEqual(['e2'])
  })

  it('refuses a member without an id, and a visitor with one', async () => {
    const actorCheck = { code: '23514', constraint: 'audit_entry_actor_check' }

    await expect(
      sql`insert into audit_entry (id, organization_id, at, actor_kind, actor_id, resource_type, resource_id, action)
          values ('e1', 'org-1', now(), 'member', null, 'customer', 'c1', 'deleted')`.execute(db)
    ).rejects.toMatchObject(actorCheck)
    await expect(
      sql`insert into audit_entry (id, organization_id, at, actor_kind, actor_id, resource_type, resource_id, action)
          values ('e1', 'org-1', now(), 'visitor', 'user-ada', 'customer', 'c1', 'created')`.execute(db)
    ).rejects.toMatchObject(actorCheck)
  })
})

/** What "append only" means in fact (ADR 0061): inside a tenant transaction, history cannot change. */
describe('the audit trail under the tenant role (ADR 0055)', () => {
  const unitOfWork = new KyselyUnitOfWork(db, (transaction) => ({
    audit: new KyselyAuditTrail(transaction),
    rewrite: () => sql`update audit_entry set action = 'created'`.execute(transaction),
    erase: () => sql`delete from audit_entry`.execute(transaction)
  }))
  const refused = { code: '42501' }

  const trail = new KyselyAuditTrail(db)

  beforeEach(async () => {
    await trail.record(anEntry('e1'))
    await trail.record(anEntry('e2', { organizationId: 'org-2' }))
  })

  it('records and reads the entries of its own organization only', async () => {
    const seen = await unitOfWork.run('org-1', async ({ audit }) => {
      await audit.record(anEntry('e3', { at: days(1) }))
      return audit.list('org-1', { limit: 10 })
    })

    expect(seen.map((entry) => entry.id)).toEqual(['e3', 'e1'])
    expect(await unitOfWork.run('org-1', ({ audit }) => audit.list('org-2', { limit: 10 }))).toEqual([])
  })

  it('cannot record an entry into another organization', async () => {
    await expect(
      unitOfWork.run('org-1', ({ audit }) => audit.record(anEntry('e3', { organizationId: 'org-2' })))
    ).rejects.toMatchObject(refused)
  })

  it('cannot change an entry, nor delete one', async () => {
    await expect(unitOfWork.run('org-1', ({ rewrite }) => rewrite())).rejects.toMatchObject(refused)
    await expect(unitOfWork.run('org-1', ({ erase }) => erase())).rejects.toMatchObject(refused)

    expect(await trail.list('org-1', { limit: 10 })).toEqual([anEntry('e1')])
  })
})

describe('purgeAuditEntries (ADR 0050)', () => {
  const trail = new KyselyAuditTrail(db)

  it('deletes entries past the retention, in batches, and keeps the rest', async () => {
    const now = days(auditRetention.days)
    await trail.record(anEntry('old-1', { at: days(-1) }))
    await trail.record(anEntry('old-2', { at: days(-2), organizationId: 'org-2' }))
    await trail.record(anEntry('old-3', { at: days(-3) }))
    await trail.record(anEntry('kept', { at: auditDay }))

    expect(await purgeAuditEntries(db, now, { batchSize: 2 })).toBe(3)
    expect(await purgeAuditEntries(db, now)).toBe(0)
    expect((await trail.list('org-1', { limit: 10 })).map((entry) => entry.id)).toEqual(['kept'])
  })
})
