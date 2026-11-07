import { CustomerAlreadyArchivedException, CustomerNotArchivedException } from './customers.errors'

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
  /** Null while the customer is active. */
  archivedAt: Date | null
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
    archivedAt: null
  }
}

export function updateCustomer(customer: Customer, details: CustomerDetails): Customer {
  return { ...customer, ...details }
}

export function archiveCustomer(customer: Customer, now: Date): Customer {
  if (customer.archivedAt !== null) throw new CustomerAlreadyArchivedException()
  return { ...customer, archivedAt: now }
}

export function restoreCustomer(customer: Customer): Customer {
  if (customer.archivedAt === null) throw new CustomerNotArchivedException()
  return { ...customer, archivedAt: null }
}

/** A customer is archived before it is deleted, so a mistaken click costs a restore, not the record. */
export function assertCanDelete(customer: Customer): void {
  if (customer.archivedAt === null) throw new CustomerNotArchivedException()
}
