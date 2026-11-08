import type { Customer } from '@repo/contracts'
import type { Clock } from '#libs/ports/clock.port'
import type { CustomerRepository } from '../../customer-repository.port'
import { toCustomerResponse } from '../../customer-response'
import { archiveCustomer } from '../../domain/customer'
import { findCustomer } from '../../find-customer'

export class ArchiveCustomerService {
  constructor(
    private readonly repository: CustomerRepository,
    private readonly clock: Clock
  ) {}

  async execute(organizationId: string, id: string): Promise<Customer> {
    const archived = archiveCustomer(await findCustomer(this.repository, organizationId, id), this.clock.now())
    return toCustomerResponse(await this.repository.save(archived))
  }
}
