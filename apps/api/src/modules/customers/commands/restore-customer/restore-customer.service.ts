import type { Customer } from '@repo/contracts'
import type { AuditActor } from '#libs/ports/audit-trail.port'
import type { Clock } from '#libs/ports/clock.port'
import type { IdGenerator } from '#libs/ports/id-generator.port'
import { assertWithinLimit } from '#modules/billing/index'
import { customerEntry } from '../../customer-audit'
import { toCustomerResponse } from '../../customer-response'
import type { CustomersUnitOfWork } from '../../customers-unit-of-work.port'
import { restoreCustomer } from '../../domain/customer'
import { findCustomer } from '../../find-customer'

/** A restored customer is active again, so it counts toward the plan's `customers.max`, as a new one does (ADR 0063). */
export class RestoreCustomerService {
  constructor(
    private readonly unitOfWork: CustomersUnitOfWork,
    private readonly clock: Clock,
    private readonly ids: IdGenerator
  ) {}

  async execute(organizationId: string, id: string, actor: AuditActor, limit: number | null): Promise<Customer> {
    const now = this.clock.now()
    const entryId = this.ids.generate()
    return this.unitOfWork.run(organizationId, async ({ customers, audit }) => {
      const restored = restoreCustomer(await findCustomer(customers, organizationId, id), now)
      if (limit !== null) assertWithinLimit('customers.max', limit, await customers.countActive(organizationId))
      const saved = await customers.save(restored)
      await audit.record(customerEntry(saved, { id: entryId, at: now, actor, action: 'restored' }))
      return toCustomerResponse(saved)
    })
  }
}
