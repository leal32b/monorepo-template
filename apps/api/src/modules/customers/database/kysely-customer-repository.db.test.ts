import { fileURLToPath } from 'node:url'
import { sql } from 'kysely'
import pino from 'pino'
import { inject } from 'vitest'
import { createDatabase, createPool } from '#libs/database/database'
import { runMigrations } from '#libs/database/migrations'
import { resetDatabase } from '../../../../test/reset-database'
import { aCustomer, contractOrganizations, describeCustomerRepository } from '../testing/customer-repository.contract'
import { KyselyCustomerRepository } from './kysely-customer-repository'

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

describeCustomerRepository('KyselyCustomerRepository', async () => {
  await sql`truncate customer`.execute(db)
  return new KyselyCustomerRepository(db)
})

describe('KyselyCustomerRepository', () => {
  beforeEach(async () => {
    await sql`truncate customer`.execute(db)
  })

  it('goes with its organization when the organization is deleted', async () => {
    const repo = new KyselyCustomerRepository(db)
    await sql`insert into auth.organization (id, name, slug, "createdAt") values ('org-gone', 'Gone', 'gone', now())`.execute(
      db
    )
    await repo.insert(aCustomer('c1', { organizationId: 'org-gone' }))
    await repo.insert(aCustomer('c2', { organizationId: 'org-2' }))

    await sql`delete from auth.organization where id = 'org-gone'`.execute(db)

    expect(await repo.findById('org-gone', 'c1')).toBeNull()
    expect(await repo.findById('org-2', 'c2')).not.toBeNull()
  })

  it('lets a failure that is not about the email through', async () => {
    const repo = new KyselyCustomerRepository(db)
    await repo.insert(aCustomer('c1'))

    await expect(repo.insert(aCustomer('c1'))).rejects.toMatchObject({
      code: '23505',
      constraint: 'customer_pkey'
    })
  })
})
