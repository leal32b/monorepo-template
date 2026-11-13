import type { AuditTrail } from '#libs/ports/audit-trail.port'
import type { UnitOfWork } from '#libs/ports/unit-of-work.port'
import type { SubscriptionRepository } from './subscription-repository.port'

/** What one transaction of the billing module offers (ADR 0052). */
export type BillingRepositories = {
  subscriptions: SubscriptionRepository
  /** Every change of the row records its entry here, in the same transaction (ADR 0061, ADR 0063). */
  audit: AuditTrail
}

/**
 * The module's database work for one organization (ADR 0052, ADR 0055): a use case or the job reads,
 * decides and writes inside `run(organizationId, …)`, and calls the provider outside it.
 */
export type BillingUnitOfWork = UnitOfWork<BillingRepositories>
