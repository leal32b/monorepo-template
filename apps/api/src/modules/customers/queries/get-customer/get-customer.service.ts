import type { Customer } from '@repo/contracts'
import { toCustomerResponse } from '../../customer-response'
import type { CustomersUnitOfWork } from '../../customers-unit-of-work.port'
import { findCustomer } from '../../find-customer'

/** A read runs inside the unit of work too: outside one, no organization is set (ADR 0055). */
export class GetCustomerService {
  constructor(private readonly unitOfWork: CustomersUnitOfWork) {}

  async execute(organizationId: string, id: string): Promise<Customer> {
    return this.unitOfWork.run(organizationId, async ({ customers }) =>
      toCustomerResponse(await findCustomer(customers, organizationId, id))
    )
  }
}
