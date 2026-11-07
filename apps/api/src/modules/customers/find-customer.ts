import type { CustomerRepository } from './customer-repository.port'
import type { Customer } from './domain/customer'
import { CustomerNotFoundException } from './domain/customers.errors'

/** The customer of the organization, or a not-found: the same answer for another tenant's id. */
export async function findCustomer(
  repository: CustomerRepository,
  organizationId: string,
  id: string
): Promise<Customer> {
  const customer = await repository.findById(organizationId, id)
  if (customer === null) throw new CustomerNotFoundException()
  return customer
}
