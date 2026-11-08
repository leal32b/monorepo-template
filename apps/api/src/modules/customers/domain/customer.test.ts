import {
  archiveCustomer,
  assertCanDelete,
  type Customer,
  createCustomer,
  restoreCustomer,
  updateCustomer
} from './customer'
import {
  CustomerAlreadyArchivedException,
  CustomerChangedException,
  CustomerNotArchivedException
} from './customers.errors'

const details = { name: 'Ada Lovelace', email: 'ada@example.com', phone: null, company: null, notes: null }
const created = new Date('2026-11-07T10:00:00.000Z')
const later = new Date('2026-11-08T10:00:00.000Z')

const customer = (): Customer => createCustomer({ id: 'c1', organizationId: 'org-1', now: created, details })

describe('createCustomer', () => {
  it('starts active, in the organization, on the day it was made, at version 1', () => {
    expect(customer()).toEqual({
      id: 'c1',
      organizationId: 'org-1',
      ...details,
      createdAt: created,
      updatedAt: created,
      archivedAt: null,
      version: 1
    })
  })
})

describe('updateCustomer', () => {
  const next = { name: 'Ada King', email: null, phone: '123', company: 'Engines', notes: 'Note' }

  it('replaces the details, keeps who, where and the version, and stamps the save', () => {
    expect(updateCustomer(customer(), next, { version: 1, now: later })).toEqual({
      ...customer(),
      ...next,
      updatedAt: later
    })
  })

  it('refuses details from someone who read an older version', () => {
    const saved = { ...customer(), version: 2 }

    expect(() => updateCustomer(saved, next, { version: 1, now: later })).toThrow(CustomerChangedException)
  })
})

describe('archiveCustomer', () => {
  it('stamps the day it was archived, which is also its last save', () => {
    expect(archiveCustomer(customer(), later)).toMatchObject({ archivedAt: later, updatedAt: later })
  })

  it('refuses to archive a customer already archived', () => {
    const archived = archiveCustomer(customer(), later)

    expect(() => archiveCustomer(archived, later)).toThrow(CustomerAlreadyArchivedException)
  })
})

describe('restoreCustomer', () => {
  it('makes an archived customer active again, and stamps the save', () => {
    const evenLater = new Date('2026-11-09T10:00:00.000Z')

    expect(restoreCustomer(archiveCustomer(customer(), later), evenLater)).toMatchObject({
      archivedAt: null,
      updatedAt: evenLater
    })
  })

  it('refuses to restore a customer that is active', () => {
    expect(() => restoreCustomer(customer(), later)).toThrow(CustomerNotArchivedException)
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
