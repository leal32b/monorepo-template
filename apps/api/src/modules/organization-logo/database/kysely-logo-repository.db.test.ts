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
import { logoRepositoryContract } from '../testing/logo-repository.contract'
import { kyselyOrganizationLogoUnitOfWork } from './kysely-organization-logo-unit-of-work'

const migrations = fileURLToPath(new URL('../../../../migrations/', import.meta.url))
const db = createDatabase(createPool(inject('databaseUrl'), pino({ level: 'silent' })))
const clock = new FixedClock(new Date('2026-11-20T12:00:00.000Z'))
const unitOfWork = kyselyOrganizationLogoUnitOfWork(
  db,
  (transaction) => new KyselyJobs(transaction, new UuidGenerator(), clock)
)

beforeAll(async () => {
  await resetDatabase(db)
  await runMigrations(db, migrations)
  for (const id of ['org-1', 'org-2']) {
    await sql`insert into auth.organization (id, name, slug, "createdAt", "timeZone", currency)
      values (${id}, ${id}, ${id}, now(), 'UTC', 'USD')`.execute(db)
  }
})

afterAll(async () => {
  await db.destroy()
})

logoRepositoryContract(async () => {
  await sql`truncate organization_logo`.execute(db)
  return { run: (organizationId, work) => unitOfWork.run(organizationId, ({ logos }) => work(logos)) }
})

describe('organization_logo (ADR 0076)', () => {
  it('shows a unit of work only its own organization’s logo, whatever the query says (ADR 0055)', async () => {
    await sql`truncate organization_logo`.execute(db)
    await sql`insert into organization_logo (organization_id, id, type, width, height, size, updated_by, updated_at)
      values ('org-2', 'logo-2', 'image/png', 64, 64, 10, 'user-ada', now())`.execute(db)

    expect(await unitOfWork.run('org-1', ({ logos }) => logos.find('org-2'))).toBeNull()
  })

  it('goes with its organization', async () => {
    await sql`insert into auth.organization (id, name, slug, "createdAt", "timeZone", currency)
      values ('org-3', 'org-3', 'org-3', now(), 'UTC', 'USD')`.execute(db)
    await sql`insert into organization_logo (organization_id, id, type, width, height, size, updated_by, updated_at)
      values ('org-3', 'logo-3', 'image/png', 64, 64, 10, 'user-ada', now())`.execute(db)

    await sql`delete from auth.organization where id = 'org-3'`.execute(db)

    const { rows } = await sql`select from organization_logo where organization_id = 'org-3'`.execute(db)
    expect(rows).toHaveLength(0)
  })
})
