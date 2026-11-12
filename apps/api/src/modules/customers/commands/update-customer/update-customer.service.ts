import type { Customer, CustomerUpdate } from '@repo/contracts'
import type { Clock } from '#libs/ports/clock.port'
import { toCustomerResponse, toDetails } from '../../customer-response'
import type { CustomersUnitOfWork } from '../../customers-unit-of-work.port'
import { updateCustomer } from '../../domain/customer'
import { findCustomer } from '../../find-customer'

export class UpdateCustomerService {
  constructor(
    private readonly unitOfWork: CustomersUnitOfWork,
    private readonly clock: Clock
  ) {}

  /** `values.version` is the version the caller read: an older one is refused (ADR 0048). */
  async execute(organizationId: string, id: string, { version, ...values }: CustomerUpdate): Promise<Customer> {
    return this.unitOfWork.run(organizationId, async ({ customers }) => {
      const customer = await findCustomer(customers, organizationId, id)
      const updated = updateCustomer(customer, toDetails(values), { version, now: this.clock.now() })
      return toCustomerResponse(await customers.save(updated))
    })
  }
}
