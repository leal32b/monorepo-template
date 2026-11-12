import { fileURLToPath } from 'node:url'
import { sql } from 'kysely'
import pino from 'pino'
import { inject } from 'vitest'
import { anEntry } from '#libs/audit/testing/audit-trail.contract'
import { createDatabase, createPool } from '#libs/database/database'
import { KyselyAuditTrail } from '#libs/database/kysely-audit-trail'
import { runMigrations } from '#libs/database/migrations'
import { resetDatabase } from '../../../../test/reset-database'
import { kyselyAuditUnitOfWork } from './kysely-audit-unit-of-work'

const migrations = fileURLToPath(new URL('../../../../migrations/', import.meta.url))
const db = createDatabase(createPool(inject('databaseUrl'), pino({ level: 'silent' })))

beforeAll(async () => {
  await resetDatabase(db)
  await runMigrations(db, migrations)
  await sql`insert into auth.organization (id, name, slug, "createdAt")
    values ('org-1', 'org-1', 'org-1', now()), ('org-2', 'org-2', 'org-2', now())`.execute(db)
})

afterAll(() => db.destroy())

describe('kyselyAuditUnitOfWork (ADR 0061)', () => {
  it('reads the trail of the organization of its transaction alone', async () => {
    const owner = new KyselyAuditTrail(db)
    await owner.record(anEntry('e1'))
    await owner.record(anEntry('e2', { organizationId: 'org-2' }))

    const seen = await kyselyAuditUnitOfWork(db).run('org-1', ({ audit }) => audit.list('org-2', { limit: 10 }))

    expect(seen).toEqual([])
  })
})
