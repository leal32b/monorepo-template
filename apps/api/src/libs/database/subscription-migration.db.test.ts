import { cpSync, mkdtempSync, readdirSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { sql } from 'kysely'
import pino from 'pino'
import { inject } from 'vitest'
import { resetDatabase } from '../../../test/reset-database'
import { createDatabase, createPool } from './database'
import { KyselyUnitOfWork } from './kysely-unit-of-work'
import { runMigrations } from './migrations'

const migrations = fileURLToPath(new URL('../../../migrations/', import.meta.url))
const db = createDatabase(createPool(inject('databaseUrl'), pino({ level: 'silent' })))

const organization = (id: string) =>
  sql`insert into auth.organization (id, name, slug, "createdAt") values (${id}, ${id}, ${id}, now() - interval '30 days')`

/** Migration 0013: the subscription of ADR 0063, one row per organization, under the tenant net. */
describe('the subscription table', () => {
  let dir: string

  beforeAll(async () => {
    dir = mkdtempSync(join(tmpdir(), 'migrations-'))
    for (const file of readdirSync(migrations).filter((name) => name < '0013')) {
      cpSync(join(migrations, file), join(dir, file))
    }
    await resetDatabase(db)
    await runMigrations(db, dir)
    await organization('org-before').execute(db)
    await runMigrations(db, migrations)
  })

  afterAll(async () => {
    rmSync(dir, { recursive: true, force: true })
    await db.destroy()
  })

  it('starts a trial of 14 days on the day of the migration for each organization that already existed', async () => {
    const { rows } = await sql<{ status: string; plan: string | null; days: number; fresh: boolean; version: number }>`
      select status, plan, version, (extract(epoch from trial_ends_at - created_at) / 86400)::float8 as days,
             created_at > now() - interval '1 minute' as fresh
      from subscription where organization_id = 'org-before'
    `.execute(db)

    expect(rows).toEqual([{ status: 'trialing', plan: null, version: 1, days: 14, fresh: true }])
  })

  it('holds the status to the four of the contract, and a checkout to its kind, plan and amount together', async () => {
    await organization('org-checks').execute(db)
    const insert = (status: string, checkout: [string | null, string | null, number | null]) =>
      sql`insert into subscription (organization_id, status, trial_ends_at, checkout_kind, checkout_plan, checkout_amount, created_at, updated_at)
          values ('org-checks', ${status}, now(), ${checkout[0]}, ${checkout[1]}, ${checkout[2]}, now(), now())`.execute(
        db
      )

    await expect(insert('paused', [null, null, null])).rejects.toMatchObject({ code: '23514' })
    await expect(insert('active', ['upgrade', 'pro', null])).rejects.toMatchObject({ code: '23514' })
    await expect(insert('active', ['refund', 'pro', 2000])).rejects.toMatchObject({ code: '23514' })
    await expect(insert('active', ['upgrade', 'pro', -1])).rejects.toMatchObject({ code: '23514' })
  })

  it("keeps a provider's customer and subscription to one row each", async () => {
    await organization('org-a').execute(db)
    await organization('org-b').execute(db)
    const insert = (id: string, customer: string, subscription: string) =>
      sql`insert into subscription (organization_id, status, trial_ends_at, provider, provider_customer_id, provider_subscription_id, created_at, updated_at)
          values (${id}, 'active', now(), 'fake', ${customer}, ${subscription}, now(), now())`.execute(db)

    await insert('org-a', 'cus-1', 'sub-1')
    await expect(insert('org-b', 'cus-1', 'sub-2')).rejects.toMatchObject({ code: '23505' })
    await expect(insert('org-b', 'cus-2', 'sub-1')).rejects.toMatchObject({ code: '23505' })
  })

  it('goes with its organization', async () => {
    await organization('org-gone').execute(db)
    await sql`insert into subscription (organization_id, status, trial_ends_at, created_at, updated_at)
      values ('org-gone', 'trialing', now(), now(), now())`.execute(db)

    await sql`delete from auth.organization where id = 'org-gone'`.execute(db)

    const { rows } = await sql`select from subscription where organization_id = 'org-gone'`.execute(db)
    expect(rows).toEqual([])
  })

  describe('under the tenant role (ADR 0055)', () => {
    const unitOfWork = new KyselyUnitOfWork(db, (transaction) => ({
      statuses: () =>
        sql<{ organization_id: string }>`select organization_id from subscription order by organization_id`
          .execute(transaction)
          .then(({ rows }) => rows.map((row) => row.organization_id)),
      cancel: () => sql`update subscription set status = 'cancelled'`.execute(transaction),
      erase: () => sql`delete from subscription`.execute(transaction)
    }))

    it('reads and changes its own organization only, and deletes nothing: the row goes only with its organization', async () => {
      expect(await unitOfWork.run('org-before', ({ statuses }) => statuses())).toEqual(['org-before'])
      await unitOfWork.run('org-before', ({ cancel }) => cancel())
      await expect(unitOfWork.run('org-before', ({ erase }) => erase())).rejects.toMatchObject({ code: '42501' })

      const { rows } = await sql<{ organization_id: string; status: string }>`
        select organization_id, status from subscription where organization_id in ('org-before', 'org-a') order by 1
      `.execute(db)
      expect(rows).toEqual([
        { organization_id: 'org-a', status: 'active' },
        { organization_id: 'org-before', status: 'cancelled' }
      ])
    })
  })
})
