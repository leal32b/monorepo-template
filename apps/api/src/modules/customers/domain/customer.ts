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

/**
 * One line of the customer's history (ADR 0052): who did what to which customer, and when. Ids only,
 * so a deleted customer's personal data goes with it.
 */
export type CustomerChange = {
  id: string
  organizationId: string
  customerId: string
  /** Deleting is the one change the customer's own row cannot tell. */
  action: 'deleted'
  /** The member who did it. */
  actorId: string
  at: Date
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
 * What is left of a deleted customer is this line, kept in the same transaction as the delete (ADR 0052).
 */
export function deleteCustomer(
  customer: Customer,
  by: { changeId: string; actorId: string; now: Date }
): CustomerChange {
  if (customer.archivedAt === null) throw new CustomerNotArchivedException()
  return {
    id: by.changeId,
    organizationId: customer.organizationId,
    customerId: customer.id,
    action: 'deleted',
    actorId: by.actorId,
    at: by.now
  }
}
