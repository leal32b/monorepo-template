import type { AuditActor } from '#libs/ports/audit-trail.port'
import type { Clock } from '#libs/ports/clock.port'
import type { IdGenerator } from '#libs/ports/id-generator.port'
import { customerEntry } from '../../customer-audit'
import type { CustomersUnitOfWork } from '../../customers-unit-of-work.port'
import { deleteCustomer } from '../../domain/customer'
import { findCustomer } from '../../find-customer'

/**
 * The customer goes and its audit entry stays, both or neither (ADR 0052, ADR 0061): the entry holds
 * the customer's id and no field, so the personal data goes with the record.
 */
export class DeleteCustomerService {
  constructor(
    private readonly unitOfWork: CustomersUnitOfWork,
    private readonly clock: Clock,
    private readonly ids: IdGenerator
  ) {}

  async execute(organizationId: string, id: string, actor: AuditActor): Promise<void> {
    const now = this.clock.now()
    const entryId = this.ids.generate()
    await this.unitOfWork.run(organizationId, async ({ customers, audit }) => {
      const customer = await findCustomer(customers, organizationId, id)
      deleteCustomer(customer)
      await customers.remove(customer)
      await audit.record(customerEntry(customer, { id: entryId, at: now, actor, action: 'deleted' }))
    })
  }
}
