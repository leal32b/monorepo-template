import type { Customer, CustomerValues } from '@repo/contracts'
import type { Clock } from '#libs/ports/clock.port'
import type { IdGenerator } from '#libs/ports/id-generator.port'
import { toCustomerResponse, toDetails } from '../../customer-response'
import type { CustomersUnitOfWork } from '../../customers-unit-of-work.port'
import { createCustomer } from '../../domain/customer'

/**
 * The shape of a tenant use case (ADR 0055): even one write runs inside the unit of work, which
 * confines the transaction to the organization the guard returned.
 */
export class CreateCustomerService {
  constructor(
    private readonly unitOfWork: CustomersUnitOfWork,
    private readonly clock: Clock,
    private readonly ids: IdGenerator
  ) {}

  async execute(organizationId: string, values: CustomerValues): Promise<Customer> {
    const customer = createCustomer({
      id: this.ids.generate(),
      organizationId,
      now: this.clock.now(),
      details: toDetails(values)
    })
    await this.unitOfWork.run(organizationId, ({ customers }) => customers.insert(customer))
    return toCustomerResponse(customer)
  }
}
