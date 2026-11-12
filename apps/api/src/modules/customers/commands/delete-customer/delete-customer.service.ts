import type { Clock } from '#libs/ports/clock.port'
import type { IdGenerator } from '#libs/ports/id-generator.port'
import type { CustomersUnitOfWork } from '../../customers-unit-of-work.port'
import { deleteCustomer } from '../../domain/customer'
import { findCustomer } from '../../find-customer'

/**
 * The module's use case with two writes (ADR 0052): the customer goes and a record of it stays, both
 * or neither. Everything happens inside `run`, with the repositories it hands over.
 */
export class DeleteCustomerService {
  constructor(
    private readonly unitOfWork: CustomersUnitOfWork,
    private readonly clock: Clock,
    private readonly ids: IdGenerator
  ) {}

  async execute(organizationId: string, id: string, actorId: string): Promise<void> {
    await this.unitOfWork.run(organizationId, async ({ customers, changes }) => {
      const customer = await findCustomer(customers, organizationId, id)
      const deleted = deleteCustomer(customer, { changeId: this.ids.generate(), actorId, now: this.clock.now() })
      await customers.remove(customer)
      await changes.append(deleted)
    })
  }
}
