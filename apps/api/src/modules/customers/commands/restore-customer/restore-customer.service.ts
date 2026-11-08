import type { Customer } from '@repo/contracts'
import type { Clock } from '#libs/ports/clock.port'
import type { CustomerRepository } from '../../customer-repository.port'
import { toCustomerResponse } from '../../customer-response'
import { restoreCustomer } from '../../domain/customer'
import { findCustomer } from '../../find-customer'

export class RestoreCustomerService {
  constructor(
    private readonly repository: CustomerRepository,
    private readonly clock: Clock
  ) {}

  async execute(organizationId: string, id: string): Promise<Customer> {
    const restored = restoreCustomer(await findCustomer(this.repository, organizationId, id), this.clock.now())
    return toCustomerResponse(await this.repository.save(restored))
  }
}
