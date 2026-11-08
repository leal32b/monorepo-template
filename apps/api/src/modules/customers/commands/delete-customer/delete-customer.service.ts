import type { CustomerRepository } from '../../customer-repository.port'
import { assertCanDelete } from '../../domain/customer'
import { findCustomer } from '../../find-customer'

export class DeleteCustomerService {
  constructor(private readonly repository: CustomerRepository) {}

  async execute(organizationId: string, id: string): Promise<void> {
    const customer = await findCustomer(this.repository, organizationId, id)
    assertCanDelete(customer)
    await this.repository.remove(customer)
  }
}
