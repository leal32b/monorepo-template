import type { Customer, CustomerUpdate } from '@repo/contracts'
import type { Clock } from '#libs/ports/clock.port'
import type { CustomerRepository } from '../../customer-repository.port'
import { toCustomerResponse, toDetails } from '../../customer-response'
import { updateCustomer } from '../../domain/customer'
import { findCustomer } from '../../find-customer'

export class UpdateCustomerService {
  constructor(
    private readonly repository: CustomerRepository,
    private readonly clock: Clock
  ) {}

  /** `values.version` is the version the caller read: an older one is refused (ADR 0048). */
  async execute(organizationId: string, id: string, { version, ...values }: CustomerUpdate): Promise<Customer> {
    const customer = await findCustomer(this.repository, organizationId, id)
    const updated = updateCustomer(customer, toDetails(values), { version, now: this.clock.now() })
    return toCustomerResponse(await this.repository.save(updated))
  }
}
