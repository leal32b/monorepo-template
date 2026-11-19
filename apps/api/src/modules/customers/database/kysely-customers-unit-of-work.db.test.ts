import { fileURLToPath } from 'node:url'
import { sql } from 'kysely'
import pino from 'pino'
import { inject } from 'vitest'
import { FixedClock } from '#libs/adapters/fixed-clock'
import { UuidGenerator } from '#libs/adapters/uuid-generator'
import { createDatabase, createPool } from '#libs/database/database'
import { KyselyAuditTrail } from '#libs/database/kysely-audit-trail'
import { KyselyJobs } from '#libs/database/kysely-jobs'
import { runMigrations } from '#libs/database/migrations'
import { resetDatabase } from '../../../../test/reset-database'
import { contractOrganizations } from '../testing/customer-repository.contract'
import { describeCustomersUnitOfWork } from '../testing/customers-unit-of-work.contract'
import { KyselyCustomerRepository } from './kysely-customer-repository'
import { kyselyCustomersUnitOfWork } from './kysely-customers-unit-of-work'

const migrations = fileURLToPath(new URL('../../../../migrations/', import.meta.url))
const db = createDatabase(createPool(inject('databaseUrl'), pino({ level: 'silent' })))
const clock = new FixedClock(new Date('2026-11-19T12:00:00.000Z'))

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
  await sql`truncate customer, audit_entry, job`.execute(db)
  return {
    unitOfWork: kyselyCustomersUnitOfWork(db, (transaction) => new KyselyJobs(transaction, new UuidGenerator(), clock)),
    customers: new KyselyCustomerRepository(db),
    audit: new KyselyAuditTrail(db),
    jobsKept: async () => Number((await sql<{ count: string }>`select count(*) from job`.execute(db)).rows[0]?.count)
  }
})
