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
import { KyselyBillingDirectory } from '../infrastructure/kysely-billing-directory'
import {
  aSubscription,
  contractOrganizations,
  describeSubscriptionRepository
} from '../testing/subscription-repository.contract'
import { kyselyBillingUnitOfWork } from './kysely-billing-unit-of-work'
import { KyselySubscriptionRepository } from './kysely-subscription-repository'

const migrations = fileURLToPath(new URL('../../../../migrations/', import.meta.url))
const db = createDatabase(createPool(inject('databaseUrl'), pino({ level: 'silent' })))

const createOrganization = (id: string) =>
  sql`insert into auth.organization (id, name, slug, "createdAt") values (${id}, ${id}, ${id}, now())`.execute(db)

beforeAll(async () => {
  await resetDatabase(db)
  await runMigrations(db, migrations)
  for (const id of contractOrganizations) await createOrganization(id)
})

afterAll(async () => {
  await db.destroy()
})

/** The repository and the directory on the same database: the directory reads what the repository saved. */
describeSubscriptionRepository('KyselySubscriptionRepository with KyselyBillingDirectory', async () => {
  await sql`truncate subscription`.execute(db)
  const repository = new KyselySubscriptionRepository(db)
  const directory = new KyselyBillingDirectory(db)
  return {
    find: (organizationId) => repository.find(organizationId),
    save: (subscription) => repository.save(subscription),
    organizationsFor: (provider, ids) => directory.organizationsFor(provider, ids)
  }
})

describe('KyselySubscriptionRepository', () => {
  beforeEach(async () => {
    await sql`truncate subscription`.execute(db)
  })

  it('goes with its organization when the organization is deleted', async () => {
    const repo = new KyselySubscriptionRepository(db)
    await createOrganization('org-gone')
    await repo.save(aSubscription('org-gone'))

    await sql`delete from auth.organization where id = 'org-gone'`.execute(db)

    expect(await repo.find('org-gone')).toBeNull()
  })

  it("keeps one organization's row out of another's unit of work (ADR 0055)", async () => {
    const clock = new FixedClock(new Date('2026-11-19T12:00:00.000Z'))
    const unitOfWork = kyselyBillingUnitOfWork(
      db,
      (transaction) => new KyselyJobs(transaction, new UuidGenerator(), clock)
    )
    await unitOfWork.run('org-1', ({ subscriptions }) => subscriptions.save(aSubscription('org-1')))

    const seen = await unitOfWork.run('org-2', ({ subscriptions }) => subscriptions.find('org-1'))

    expect(seen).toBeNull()
    await expect(
      unitOfWork.run('org-2', ({ subscriptions }) => subscriptions.save(aSubscription('org-1')))
    ).rejects.toThrow('row-level security')
  })
})
