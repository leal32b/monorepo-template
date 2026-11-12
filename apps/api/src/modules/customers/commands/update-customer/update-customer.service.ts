import type { Customer, CustomerUpdate } from '@repo/contracts'
import type { AuditActor } from '#libs/ports/audit-trail.port'
import type { Clock } from '#libs/ports/clock.port'
import type { IdGenerator } from '#libs/ports/id-generator.port'
import { customerEntry } from '../../customer-audit'
import { toCustomerResponse, toDetails } from '../../customer-response'
import type { CustomersUnitOfWork } from '../../customers-unit-of-work.port'
import { changedFields, updateCustomer } from '../../domain/customer'
import { findCustomer } from '../../find-customer'

export class UpdateCustomerService {
  constructor(
    private readonly unitOfWork: CustomersUnitOfWork,
    private readonly clock: Clock,
    private readonly ids: IdGenerator
  ) {}

  /** `values.version` is the version the caller read: an older one is refused (ADR 0048). */
  async execute(
    organizationId: string,
    id: string,
    { version, ...values }: CustomerUpdate,
    actor: AuditActor
  ): Promise<Customer> {
    const now = this.clock.now()
    const entryId = this.ids.generate()
    return this.unitOfWork.run(organizationId, async ({ customers, audit }) => {
      const customer = await findCustomer(customers, organizationId, id)
      const updated = updateCustomer(customer, toDetails(values), { version, now })
      const saved = await customers.save(updated)
      await audit.record(
        customerEntry(saved, { id: entryId, at: now, actor, action: 'updated', fields: changedFields(customer, saved) })
      )
      return toCustomerResponse(saved)
    })
  }
}
