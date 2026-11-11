import { fileURLToPath } from 'node:url'
import { sql } from 'kysely'
import pino from 'pino'
import { inject } from 'vitest'
import { createDatabase, createPool } from '#libs/database/database'
import { runMigrations } from '#libs/database/migrations'
import { resetDatabase } from '../../../../test/reset-database'
import { contractOrganizations } from '../testing/customer-repository.contract'
import { describeCustomersUnitOfWork } from '../testing/customers-unit-of-work.contract'
import { KyselyCustomerChangeLog } from './kysely-customer-change-log'
import { KyselyCustomerRepository } from './kysely-customer-repository'
import { kyselyCustomersUnitOfWork } from './kysely-customers-unit-of-work'

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

describeCustomersUnitOfWork('kyselyCustomersUnitOfWork', async () => {
  await sql`truncate customer, customer_change`.execute(db)
  return {
    unitOfWork: kyselyCustomersUnitOfWork(db),
    customers: new KyselyCustomerRepository(db),
    changes: new KyselyCustomerChangeLog(db)
  }
})
