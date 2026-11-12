import { cpSync, mkdtempSync, readdirSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { sql } from 'kysely'
import pino from 'pino'
import { inject } from 'vitest'
import { anEntry, auditDay } from '#libs/audit/testing/audit-trail.contract'
import { resetDatabase } from '../../../test/reset-database'
import { createDatabase, createPool } from './database'
import { KyselyAuditTrail } from './kysely-audit-trail'
import { runMigrations } from './migrations'

const migrations = fileURLToPath(new URL('../../../migrations/', import.meta.url))
const db = createDatabase(createPool(inject('databaseUrl'), pino({ level: 'silent' })))
const nextDay = new Date(auditDay.getTime() + 24 * 60 * 60 * 1000)

/** Migration 0012 folds `customer_change` into the trail, rows and all, and drops it. */
describe('the move from customer_change', () => {
  let dir: string

  beforeAll(async () => {
    dir = mkdtempSync(join(tmpdir(), 'migrations-'))
    for (const file of readdirSync(migrations).filter((name) => name < '0012')) {
      cpSync(join(migrations, file), join(dir, file))
    }
    await resetDatabase(db)
    await runMigrations(db, dir)
    await sql`insert into auth.organization (id, name, slug, "createdAt") values ('org-1', 'org-1', 'org-1', now())`.execute(
      db
    )
    await sql`
      insert into customer_change (id, organization_id, customer_id, action, actor_kind, actor_id, at) values
        ('ch1', 'org-1', 'c1', 'deleted', 'member', 'user-ada', ${auditDay}),
        ('ch2', 'org-1', 'c2', 'created', 'visitor', null, ${nextDay})
    `.execute(db)
    await runMigrations(db, migrations)
  })

  afterAll(async () => {
    rmSync(dir, { recursive: true, force: true })
    await db.destroy()
  })

  it('keeps every change as an entry with no field, and leaves no customer_change behind', async () => {
    expect(await new KyselyAuditTrail(db).list('org-1', { limit: 10 })).toEqual([
      anEntry('ch2', { at: nextDay, actor: { kind: 'visitor' }, resourceId: 'c2', action: 'created', fields: [] }),
      anEntry('ch1', { resourceId: 'c1', action: 'deleted', fields: [] })
    ])
    const { rows } = await sql<{ found: string | null }>`select to_regclass('customer_change') as found`.execute(db)
    expect(rows).toEqual([{ found: null }])
  })
})
