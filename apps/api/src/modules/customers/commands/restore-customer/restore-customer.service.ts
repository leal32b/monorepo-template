import type { Customer } from '@repo/contracts'
import type { AuditActor } from '#libs/ports/audit-trail.port'
import type { Clock } from '#libs/ports/clock.port'
import type { IdGenerator } from '#libs/ports/id-generator.port'
import { customerEntry } from '../../customer-audit'
import { toCustomerResponse } from '../../customer-response'
import type { CustomersUnitOfWork } from '../../customers-unit-of-work.port'
import { restoreCustomer } from '../../domain/customer'
import { findCustomer } from '../../find-customer'

export class RestoreCustomerService {
  constructor(
    private readonly unitOfWork: CustomersUnitOfWork,
    private readonly clock: Clock,
    private readonly ids: IdGenerator
  ) {}

  async execute(organizationId: string, id: string, actor: AuditActor): Promise<Customer> {
    const now = this.clock.now()
    const entryId = this.ids.generate()
    return this.unitOfWork.run(organizationId, async ({ customers, audit }) => {
      const saved = await customers.save(restoreCustomer(await findCustomer(customers, organizationId, id), now))
      await audit.record(customerEntry(saved, { id: entryId, at: now, actor, action: 'restored' }))
      return toCustomerResponse(saved)
    })
  }
}
