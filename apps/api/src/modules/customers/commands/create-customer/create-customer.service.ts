import type { Customer, CustomerValues } from '@repo/contracts'
import type { Clock } from '#libs/ports/clock.port'
import type { IdGenerator } from '#libs/ports/id-generator.port'
import type { CustomerRepository } from '../../customer-repository.port'
import { toCustomerResponse, toDetails } from '../../customer-response'
import { createCustomer } from '../../domain/customer'

export class CreateCustomerService {
  constructor(
    private readonly repository: CustomerRepository,
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
    await this.repository.insert(customer)
    return toCustomerResponse(customer)
  }
}
