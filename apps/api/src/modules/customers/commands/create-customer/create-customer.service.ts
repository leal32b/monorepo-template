import type { Customer, CustomerValues } from '@repo/contracts'
import type { AuditActor } from '#libs/ports/audit-trail.port'
import type { Clock } from '#libs/ports/clock.port'
import type { IdGenerator } from '#libs/ports/id-generator.port'
import { customerEntry } from '../../customer-audit'
import { toCustomerResponse, toDetails } from '../../customer-response'
import type { CustomersUnitOfWork } from '../../customers-unit-of-work.port'
import { changedFields, createCustomer } from '../../domain/customer'

/**
 * The shape of a tenant write (ADR 0055, ADR 0061): the change and its audit entry in one unit of
 * work, which confines the transaction to the organization the guard returned.
 */
export class CreateCustomerService {
  constructor(
    private readonly unitOfWork: CustomersUnitOfWork,
    private readonly clock: Clock,
    private readonly ids: IdGenerator
  ) {}

  async execute(organizationId: string, values: CustomerValues, actor: AuditActor): Promise<Customer> {
    const now = this.clock.now()
    const customer = createCustomer({ id: this.ids.generate(), organizationId, now, details: toDetails(values) })
    const entry = customerEntry(customer, {
      id: this.ids.generate(),
      at: now,
      actor,
      action: 'created',
      fields: changedFields(null, customer)
    })
    await this.unitOfWork.run(organizationId, async ({ customers, audit }) => {
      await customers.insert(customer)
      await audit.record(entry)
    })
    return toCustomerResponse(customer)
  }
}
