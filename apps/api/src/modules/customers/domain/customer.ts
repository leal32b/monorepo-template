import {
  CustomerAlreadyArchivedException,
  CustomerChangedException,
  CustomerNotArchivedException
} from './customers.errors'

/** What a person types about a customer; an empty field is `null`. */
export type CustomerDetails = {
  name: string
  email: string | null
  phone: string | null
  company: string | null
  notes: string | null
}

export type Customer = CustomerDetails & {
  id: string
  /** The tenant (ADR 0033): set once, from the path, never changed. */
  organizationId: string
  createdAt: Date
  /** The last time it was saved. */
  updatedAt: Date
  /** Null while the customer is active. */
  archivedAt: Date | null
  /**
   * How many times it was saved, from 1 (ADR 0048). The repository raises it on every save, and only
   * when the stored customer is still at the version this one was read at.
   */
  version: number
}

/** The domain draws no id and reads no clock: the use case passes both in. */
export function createCustomer(input: {
  id: string
  organizationId: string
  now: Date
  details: CustomerDetails
}): Customer {
  return {
    id: input.id,
    organizationId: input.organizationId,
    ...input.details,
    createdAt: input.now,
    updatedAt: input.now,
    archivedAt: null,
    version: 1
  }
}

/**
 * New details for the customer, from someone who read it at `version`: an older version means someone
 * else saved it since, and their changes would be lost in silence.
 */
export function updateCustomer(
  customer: Customer,
  details: CustomerDetails,
  { version, now }: { version: number; now: Date }
): Customer {
  if (customer.version !== version) throw new CustomerChangedException()
  return { ...customer, ...details, updatedAt: now }
}

export function archiveCustomer(customer: Customer, now: Date): Customer {
  if (customer.archivedAt !== null) throw new CustomerAlreadyArchivedException()
  return { ...customer, archivedAt: now, updatedAt: now }
}

export function restoreCustomer(customer: Customer, now: Date): Customer {
  if (customer.archivedAt === null) throw new CustomerNotArchivedException()
  return { ...customer, archivedAt: null, updatedAt: now }
}

/**
 * A customer is archived before it is deleted, so a mistaken click costs a restore, not the record.
 * What is left of a deleted customer is its audit entry, ids only (ADR 0061).
 */
export function deleteCustomer(customer: Customer): void {
  if (customer.archivedAt === null) throw new CustomerNotArchivedException()
}

/**
 * A visitor asks to be a customer, through the public surface (ADR 0059): an active customer from
 * the three things a visitor may say. Company and notes are the members' to fill.
 */
export function registerCustomer(input: {
  id: string
  organizationId: string
  now: Date
  details: Pick<CustomerDetails, 'name' | 'email' | 'phone'>
}): Customer {
  return createCustomer({
    id: input.id,
    organizationId: input.organizationId,
    now: input.now,
    details: { ...input.details, company: null, notes: null }
  })
}

const detailFields = ['name', 'email', 'phone', 'company', 'notes'] as const

/**
 * What an audit entry may say of a change (ADR 0061): the names of the fields it set, never their
 * values. For a new customer (`before` is null), the fields filled; for an edit, those that differ.
 */
export function changedFields(before: CustomerDetails | null, after: CustomerDetails): (keyof CustomerDetails)[] {
  return detailFields.filter((field) => (before === null ? after[field] !== null : before[field] !== after[field]))
}
