import {
  archiveCustomer,
  assertCanDelete,
  type Customer,
  createCustomer,
  restoreCustomer,
  updateCustomer
} from './customer'
import { CustomerAlreadyArchivedException, CustomerNotArchivedException } from './customers.errors'

const details = { name: 'Ada Lovelace', email: 'ada@example.com', phone: null, company: null, notes: null }
const created = new Date('2026-11-07T10:00:00.000Z')
const later = new Date('2026-11-08T10:00:00.000Z')

const customer = (): Customer => createCustomer({ id: 'c1', organizationId: 'org-1', now: created, details })

describe('createCustomer', () => {
  it('starts active, in the organization, on the day it was made', () => {
    expect(customer()).toEqual({
      id: 'c1',
      organizationId: 'org-1',
      ...details,
      createdAt: created,
      archivedAt: null
    })
  })
})

describe('updateCustomer', () => {
  it('replaces the details and keeps who, where and when', () => {
    const next = { name: 'Ada King', email: null, phone: '123', company: 'Engines', notes: 'Note' }

    expect(updateCustomer(customer(), next)).toEqual({ ...customer(), ...next })
  })
})

describe('archiveCustomer', () => {
  it('stamps the day it was archived', () => {
    expect(archiveCustomer(customer(), later).archivedAt).toEqual(later)
  })

  it('refuses to archive a customer already archived', () => {
    const archived = archiveCustomer(customer(), later)

    expect(() => archiveCustomer(archived, later)).toThrow(CustomerAlreadyArchivedException)
  })
})

describe('restoreCustomer', () => {
  it('makes an archived customer active again', () => {
    expect(restoreCustomer(archiveCustomer(customer(), later)).archivedAt).toBeNull()
  })

  it('refuses to restore a customer that is active', () => {
    expect(() => restoreCustomer(customer())).toThrow(CustomerNotArchivedException)
  })
})

describe('assertCanDelete', () => {
  it('lets an archived customer go', () => {
    expect(() => assertCanDelete(archiveCustomer(customer(), later))).not.toThrow()
  })

  it('keeps an active customer: it is archived first', () => {
    expect(() => assertCanDelete(customer())).toThrow(CustomerNotArchivedException)
  })
})
