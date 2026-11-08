import type { CustomerRepository } from '../customer-repository.port'
import { type Customer, createCustomer } from '../domain/customer'
import {
  CustomerChangedException,
  CustomerEmailTakenException,
  CustomerNotFoundException
} from '../domain/customers.errors'

/** The organizations a repository under test must know (a database adapter creates them first). */
export const contractOrganizations = ['org-1', 'org-2'] as const

const day = new Date('2026-11-07T10:00:00.000Z')

export function aCustomer(id: string, overrides: Partial<Customer> = {}): Customer {
  return {
    ...createCustomer({
      id,
      organizationId: 'org-1',
      now: day,
      details: { name: `Customer ${id}`, email: null, phone: null, company: null, notes: null }
    }),
    ...overrides
  }
}

/**
 * What every `CustomerRepository` must do, run against the in-memory fake and the database adapter
 * alike, so the fake that use-case tests lean on cannot drift from the real thing.
 */
export function describeCustomerRepository(label: string, make: () => Promise<CustomerRepository>): void {
  describe(`${label} as a CustomerRepository`, () => {
    let repo: CustomerRepository

    beforeEach(async () => {
      repo = await make()
    })

    const filter = { status: 'active', page: 1, pageSize: 25 } as const

    describe('insert and findById', () => {
      it('keeps a customer whole', async () => {
        const customer = aCustomer('c1', { email: 'ada@example.com', phone: '1', company: 'E', notes: 'N' })

        await repo.insert(customer)

        expect(await repo.findById('org-1', 'c1')).toEqual(customer)
      })

      it('keeps the archived day', async () => {
        const customer = aCustomer('c1', { archivedAt: new Date('2026-11-09T10:00:00.000Z') })

        await repo.insert(customer)

        expect(await repo.findById('org-1', 'c1')).toEqual(customer)
      })

      it('finds nothing for an unknown id, or one of another organization', async () => {
        await repo.insert(aCustomer('c1'))

        expect(await repo.findById('org-1', 'nope')).toBeNull()
        expect(await repo.findById('org-2', 'c1')).toBeNull()
      })
    })

    describe('email', () => {
      it('is unique per organization, in any case', async () => {
        await repo.insert(aCustomer('c1', { email: 'ada@example.com' }))

        await expect(repo.insert(aCustomer('c2', { email: 'ADA@example.com' }))).rejects.toThrow(
          CustomerEmailTakenException
        )
      })

      it('is still taken by an archived customer', async () => {
        await repo.insert(aCustomer('c1', { email: 'ada@example.com', archivedAt: day }))

        await expect(repo.insert(aCustomer('c2', { email: 'ada@example.com' }))).rejects.toThrow(
          CustomerEmailTakenException
        )
      })

      it('may repeat in another organization, and customers with none do not collide', async () => {
        await repo.insert(aCustomer('c1', { email: 'ada@example.com' }))
        await repo.insert(aCustomer('c2', { organizationId: 'org-2', email: 'ada@example.com' }))
        await repo.insert(aCustomer('c3'))
        await repo.insert(aCustomer('c4'))

        expect((await repo.list('org-1', filter)).total).toBe(3)
      })
    })

    describe('save', () => {
      it('replaces the stored customer and returns it at the next version', async () => {
        await repo.insert(aCustomer('c1'))
        const changed = aCustomer('c1', { name: 'Renamed', archivedAt: day, updatedAt: day })

        const saved = await repo.save(changed)

        expect(saved).toEqual({ ...changed, version: 2 })
        expect(await repo.findById('org-1', 'c1')).toEqual(saved)
      })

      it('lets a customer keep its own email', async () => {
        await repo.insert(aCustomer('c1', { email: 'ada@example.com' }))

        await expect(repo.save(aCustomer('c1', { email: 'ada@example.com', name: 'New' }))).resolves.toMatchObject({
          version: 2
        })
      })

      it('refuses an email another customer has', async () => {
        await repo.insert(aCustomer('c1', { email: 'ada@example.com' }))
        await repo.insert(aCustomer('c2'))

        await expect(repo.save(aCustomer('c2', { email: 'Ada@example.com' }))).rejects.toThrow(
          CustomerEmailTakenException
        )
      })

      it('refuses a customer read before another save, and keeps that save', async () => {
        await repo.insert(aCustomer('c1'))
        await repo.save(aCustomer('c1', { name: 'First' }))

        await expect(repo.save(aCustomer('c1', { name: 'Second' }))).rejects.toThrow(CustomerChangedException)
        expect(await repo.findById('org-1', 'c1')).toMatchObject({ name: 'First', version: 2 })
      })

      it('refuses a stale customer before its email, since the email may be the other save’s', async () => {
        await repo.insert(aCustomer('c1', { email: 'ada@example.com' }))
        await repo.insert(aCustomer('c2'))
        await repo.save(aCustomer('c2', { name: 'Bob' }))

        await expect(repo.save(aCustomer('c2', { email: 'ada@example.com' }))).rejects.toThrow(CustomerChangedException)
      })

      it('says a customer deleted meanwhile, or of another organization, is not there', async () => {
        await repo.insert(aCustomer('c1'))

        await expect(repo.save(aCustomer('c2'))).rejects.toThrow(CustomerNotFoundException)
        await expect(repo.save(aCustomer('c1', { organizationId: 'org-2' }))).rejects.toThrow(CustomerNotFoundException)
      })
    })

    describe('list', () => {
      it('shows only the status asked for, of the organization asked for', async () => {
        await repo.insert(aCustomer('c1'))
        await repo.insert(aCustomer('c2', { archivedAt: day }))
        await repo.insert(aCustomer('c3', { organizationId: 'org-2' }))

        expect((await repo.list('org-1', filter)).items.map((c) => c.id)).toEqual(['c1'])
        expect((await repo.list('org-1', { ...filter, status: 'archived' })).items.map((c) => c.id)).toEqual(['c2'])
      })

      it('orders by name in any case, then by id', async () => {
        await repo.insert(aCustomer('c1', { name: 'bruno' }))
        await repo.insert(aCustomer('c2', { name: 'Ana' }))
        await repo.insert(aCustomer('c4', { name: 'Carla' }))
        await repo.insert(aCustomer('c3', { name: 'Carla' }))

        expect((await repo.list('org-1', filter)).items.map((c) => c.id)).toEqual(['c2', 'c1', 'c3', 'c4'])
      })

      it('searches name, email and company, in any case', async () => {
        await repo.insert(aCustomer('c1', { name: 'Ada Lovelace' }))
        await repo.insert(aCustomer('c2', { name: 'Bob', email: 'ada@example.com' }))
        await repo.insert(aCustomer('c3', { name: 'Cy', company: 'Adamant Co' }))
        await repo.insert(aCustomer('c4', { name: 'Dee' }))

        const found = await repo.list('org-1', { ...filter, search: 'ADA' })

        expect(found.items.map((c) => c.id)).toEqual(['c1', 'c2', 'c3'])
        expect(found.total).toBe(3)
      })

      it('takes a search for a pattern as plain text', async () => {
        await repo.insert(aCustomer('c1', { name: '100% Discount' }))
        await repo.insert(aCustomer('c2', { name: 'Other' }))

        expect((await repo.list('org-1', { ...filter, search: '%' })).items.map((c) => c.id)).toEqual(['c1'])
        expect((await repo.list('org-1', { ...filter, search: '_' })).items).toEqual([])
      })

      it('pages, and counts the whole filter', async () => {
        for (const id of ['a', 'b', 'c', 'd', 'e']) await repo.insert(aCustomer(id, { name: id }))

        const second = await repo.list('org-1', { ...filter, page: 2, pageSize: 2 })
        const beyond = await repo.list('org-1', { ...filter, page: 4, pageSize: 2 })

        expect(second.items.map((c) => c.id)).toEqual(['c', 'd'])
        expect(second.total).toBe(5)
        expect(beyond).toEqual({ items: [], total: 5 })
      })
    })

    describe('remove', () => {
      it('deletes the customer', async () => {
        await repo.insert(aCustomer('c1'))

        await repo.remove(aCustomer('c1'))

        expect(await repo.findById('org-1', 'c1')).toBeNull()
      })

      it('leaves another organization’s customer alone', async () => {
        await repo.insert(aCustomer('c1'))

        await expect(repo.remove(aCustomer('c1', { organizationId: 'org-2' }))).rejects.toThrow(
          CustomerNotFoundException
        )
        expect(await repo.findById('org-1', 'c1')).not.toBeNull()
      })

      it('refuses a customer read before another save, and keeps it', async () => {
        await repo.insert(aCustomer('c1'))
        await repo.save(aCustomer('c1'))

        await expect(repo.remove(aCustomer('c1'))).rejects.toThrow(CustomerChangedException)
        expect(await repo.findById('org-1', 'c1')).not.toBeNull()
      })

      it('says a customer deleted meanwhile is not there', async () => {
        await expect(repo.remove(aCustomer('c1'))).rejects.toThrow(CustomerNotFoundException)
      })
    })
  })
}
