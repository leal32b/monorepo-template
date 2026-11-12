import type { Customer } from '@repo/contracts'
import type { Clock } from '#libs/ports/clock.port'
import { toCustomerResponse } from '../../customer-response'
import type { CustomersUnitOfWork } from '../../customers-unit-of-work.port'
import { restoreCustomer } from '../../domain/customer'
import { findCustomer } from '../../find-customer'

export class RestoreCustomerService {
  constructor(
    private readonly unitOfWork: CustomersUnitOfWork,
    private readonly clock: Clock
  ) {}

  async execute(organizationId: string, id: string): Promise<Customer> {
    return this.unitOfWork.run(organizationId, async ({ customers }) => {
      const restored = restoreCustomer(await findCustomer(customers, organizationId, id), this.clock.now())
      return toCustomerResponse(await customers.save(restored))
    })
  }
}
