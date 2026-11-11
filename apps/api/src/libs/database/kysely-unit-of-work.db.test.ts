import { fileURLToPath } from 'node:url'
import { type Kysely, sql } from 'kysely'
import pino from 'pino'
import { inject } from 'vitest'
import { resetDatabase } from '../../../test/reset-database'
import { createDatabase, createPool } from './database'
import { KyselyUnitOfWork } from './kysely-unit-of-work'
import { runMigrations } from './migrations'

const migrations = fileURLToPath(new URL('../../../migrations/', import.meta.url))
const db = createDatabase(createPool(inject('databaseUrl'), pino({ level: 'silent' })))

const add = (on: Kysely<unknown>, id: string, organizationId = 'org-1') =>
  sql`insert into unit_of_work_note (id, organization_id) values (${id}, ${organizationId})`.execute(on)
const idsOn = async (on: Kysely<unknown>) =>
  (await sql<{ id: string }>`select id from unit_of_work_note order by id`.execute(on)).rows.map((row) => row.id)
const ids = () => idsOn(db)
const session = async (on: Kysely<unknown>) =>
  (
    await sql<{ role: string; organization: string | null }>`
      select current_user as role, current_setting('app.organization_id', true) as organization
    `.execute(on)
  ).rows[0]

beforeAll(async () => {
  await resetDatabase(db)
  await runMigrations(db, migrations)
  // A tenant table as a migration writes one (ADR 0055).
  await sql
    .raw(`
      create table unit_of_work_note (id text primary key, organization_id text not null);
      alter table unit_of_work_note enable row level security;
      create policy tenant_isolation on unit_of_work_note to app_tenant
        using (organization_id = current_setting('app.organization_id', true));
      grant select, insert, update, delete on unit_of_work_note to app_tenant;
    `)
    .execute(db)
})

beforeEach(async () => {
  await sql`truncate unit_of_work_note`.execute(db)
})

afterAll(async () => {
  await sql`drop table unit_of_work_note`.execute(db)
  await db.destroy()
})

describe('KyselyUnitOfWork (ADR 0052)', () => {
  const unitOfWork = new KyselyUnitOfWork(db, (trx) => ({
    add: (id: string, organizationId?: string) => add(trx, id, organizationId),
    ids: () => idsOn(trx),
    session: () => session(trx)
  }))

  it('commits every write and returns what the work returns', async () => {
    const result = await unitOfWork.run('org-1', async (notes) => {
      await notes.add('a')
      await notes.add('b')
      return 'done'
    })

    expect(result).toBe('done')
    expect(await ids()).toEqual(['a', 'b'])
  })

  it('rolls the first write back when the second fails, and lets the error through', async () => {
    await add(db, 'kept')

    const work = unitOfWork.run('org-1', async (notes) => {
      await notes.add('a')
      await notes.add('kept')
    })

    await expect(work).rejects.toMatchObject({ code: '23505' })
    expect(await ids()).toEqual(['kept'])
  })

  it('rolls back when the work throws after its writes', async () => {
    const work = unitOfWork.run('org-1', async (notes) => {
      await notes.add('a')
      throw new Error('changed my mind')
    })

    await expect(work).rejects.toThrow('changed my mind')
    expect(await ids()).toEqual([])
  })

  describe('the tenant of the transaction (ADR 0055)', () => {
    it('runs the work as the tenant role, for the organization given', async () => {
      const inside = await unitOfWork.run('org-2', (notes) => notes.session())

      expect(inside).toEqual({ role: 'app_tenant', organization: 'org-2' })
    })

    it('leaves neither the role nor the organization on the connection afterwards', async () => {
      await unitOfWork.run('org-2', (notes) => notes.session())
      await expect(unitOfWork.run('org-2', () => Promise.reject(new Error('rolled back')))).rejects.toThrow()

      const after = await session(db)
      expect(after?.role).not.toBe('app_tenant')
      expect(after?.organization ?? '').toBe('')
    })

    it('shows the work only the rows of its organization, whatever the query asks', async () => {
      await add(db, 'ours', 'org-2')
      await add(db, 'theirs', 'org-1')

      expect(await unitOfWork.run('org-2', (notes) => notes.ids())).toEqual(['ours'])
      expect(await ids()).toEqual(['ours', 'theirs'])
    })

    it('refuses a row written for another organization', async () => {
      const work = unitOfWork.run('org-2', (notes) => notes.add('a', 'org-1'))

      await expect(work).rejects.toMatchObject({ code: '42501' })
      expect(await ids()).toEqual([])
    })
  })
})
