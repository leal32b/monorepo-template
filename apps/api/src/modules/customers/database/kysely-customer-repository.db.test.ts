import { fileURLToPath } from 'node:url'
import { type Kysely, sql } from 'kysely'
import pino from 'pino'
import { inject } from 'vitest'
import { createDatabase, createPool } from '#libs/database/database'
import { KyselyUnitOfWork } from '#libs/database/kysely-unit-of-work'
import { runMigrations } from '#libs/database/migrations'
import { resetDatabase } from '../../../../test/reset-database'
import type { Customer } from '../domain/customer'
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

/** What the net is for (ADR 0055): a repository whose every query forgot the organization. */
describe('a repository that forgets the organization filter', () => {
  const forgetful = (on: Kysely<unknown>) => ({
    names: async () =>
      (await sql<{ name: string }>`select name from customer order by name`.execute(on)).rows.map((row) => row.name),
    renameAll: async (name: string) =>
      Number((await sql`update customer set name = ${name}`.execute(on)).numAffectedRows),
    removeAll: async () => Number((await sql`delete from customer`.execute(on)).numAffectedRows),
    moveAll: (organizationId: string) => sql`update customer set organization_id = ${organizationId}`.execute(on),
    insert: (customer: Customer) => new KyselyCustomerRepository(on).insert(customer)
  })
  const unitOfWork = new KyselyUnitOfWork(db, forgetful)

  beforeEach(async () => {
    await sql`truncate customer`.execute(db)
    const owner = new KyselyCustomerRepository(db)
    await owner.insert(aCustomer('c1', { name: 'Theirs' }))
    await owner.insert(aCustomer('c2', { organizationId: 'org-2', name: 'Ours' }))
  })

  it('reads every organization on the bare connection, where nothing stands behind the filter', async () => {
    expect(await forgetful(db).names()).toEqual(['Ours', 'Theirs'])
  })

  it('reads only its organization inside a unit of work', async () => {
    expect(await unitOfWork.run('org-2', (customers) => customers.names())).toEqual(['Ours'])
  })

  it('changes and deletes only its organization inside a unit of work', async () => {
    expect(await unitOfWork.run('org-2', (customers) => customers.renameAll('Renamed'))).toBe(1)
    expect(await forgetful(db).names()).toEqual(['Renamed', 'Theirs'])

    expect(await unitOfWork.run('org-2', (customers) => customers.removeAll())).toBe(1)
    expect(await forgetful(db).names()).toEqual(['Theirs'])
  })

  it('cannot write a customer into another organization, nor move one there', async () => {
    const refused = { code: '42501' }

    await expect(unitOfWork.run('org-2', (customers) => customers.insert(aCustomer('c3')))).rejects.toMatchObject(
      refused
    )
    await expect(unitOfWork.run('org-2', (customers) => customers.moveAll('org-1'))).rejects.toMatchObject(refused)
  })

  it('sees nothing of an organization that does not exist', async () => {
    expect(await unitOfWork.run('', (customers) => customers.names())).toEqual([])
  })
})
