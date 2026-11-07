import type { Customer } from '@repo/contracts'
import type { CustomerRepository } from '../../customer-repository.port'
import { toCustomerResponse } from '../../customer-response'
import { findCustomer } from '../../find-customer'

export class GetCustomerService {
  constructor(private readonly repository: CustomerRepository) {}

  async execute(organizationId: string, id: string): Promise<Customer> {
    return toCustomerResponse(await findCustomer(this.repository, organizationId, id))
  }
}
