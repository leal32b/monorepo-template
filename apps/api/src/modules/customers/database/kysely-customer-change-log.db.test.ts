import { fileURLToPath } from 'node:url'
import { sql } from 'kysely'
import pino from 'pino'
import { inject } from 'vitest'
import { createDatabase, createPool } from '#libs/database/database'
import { runMigrations } from '#libs/database/migrations'
import { resetDatabase } from '../../../../test/reset-database'
import { aChange, describeCustomerChangeLog } from '../testing/customer-change-log.contract'
import { contractOrganizations } from '../testing/customer-repository.contract'
import { KyselyCustomerChangeLog } from './kysely-customer-change-log'

const migrations = fileURLToPath(new URL('../../../../migrations/', import.meta.url))
const db = createDatabase(createPool(inject('databaseUrl'), pino({ level: 'silent' })))

beforeAll(async () => {
  await resetDatabase(db)
  await runMigrations(db, migrations)
  for (const id of contractOrganizations) {
    await sql`insert into auth.organization (id, name, slug, "createdAt") values (${id}, ${id}, ${id}, now())`.execute(
      db
    )
  }
})

afterAll(async () => {
  await db.destroy()
})

describeCustomerChangeLog('KyselyCustomerChangeLog', async () => {
  await sql`truncate customer_change`.execute(db)
  return new KyselyCustomerChangeLog(db)
})

describe('KyselyCustomerChangeLog', () => {
  it('goes with its organization, and outlives the member who made the change', async () => {
    await sql`truncate customer_change`.execute(db)
    const log = new KyselyCustomerChangeLog(db)
    await sql`insert into auth.organization (id, name, slug, "createdAt") values ('org-gone', 'Gone', 'gone', now())`.execute(
      db
    )
    await log.append(aChange('ch1', { organizationId: 'org-gone' }))
    await log.append(aChange('ch2', { actorId: 'an-account-deleted-since' }))

    await sql`delete from auth.organization where id = 'org-gone'`.execute(db)

    expect(await log.list('org-gone')).toEqual([])
    expect((await log.list('org-1')).map((change) => change.id)).toEqual(['ch2'])
  })
})
