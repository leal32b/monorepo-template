import type { Customer, CustomerValues } from '@repo/contracts'
import type { CustomerRepository } from '../../customer-repository.port'
import { toCustomerResponse, toDetails } from '../../customer-response'
import { updateCustomer } from '../../domain/customer'
import { findCustomer } from '../../find-customer'

export class UpdateCustomerService {
  constructor(private readonly repository: CustomerRepository) {}

  async execute(organizationId: string, id: string, values: CustomerValues): Promise<Customer> {
    const updated = updateCustomer(await findCustomer(this.repository, organizationId, id), toDetails(values))
    await this.repository.save(updated)
    return toCustomerResponse(updated)
  }
}
