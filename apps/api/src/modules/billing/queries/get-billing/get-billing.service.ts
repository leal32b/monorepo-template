import { accessOf, type Billing } from '@repo/contracts'
import type { BillingProvider } from '#libs/ports/billing-provider.port'
import type { Clock } from '#libs/ports/clock.port'
import type { BillingUnitOfWork } from '../../billing-unit-of-work.port'
import { openCheckoutOf } from '../../subscription'
import { readSubscription } from '../../subscription-changes'

/**
 * The plan page's read (ADR 0063): the subscription as the membership read says it, with what only the
 * owner's page needs: the version to send back, the provider's reference, the open checkout's page while
 * it takes a payment, and the provider's minimum charge. It never calls the provider.
 */
export class GetBillingService {
  constructor(
    private readonly unitOfWork: BillingUnitOfWork,
    private readonly provider: BillingProvider,
    private readonly clock: Clock
  ) {}

  async execute(organizationId: string, trialEndsAt: Date): Promise<Billing> {
    const now = this.clock.now()
    const row = await readSubscription(this.unitOfWork, organizationId, trialEndsAt, now)
    const payable = openCheckoutOf(row, now) === 'payable' ? row.checkoutPage : null
    return {
      subscription: {
        status: row.status,
        access: accessOf(row, now),
        plan: row.plan,
        nextPlan: row.nextPlan,
        trialEndsAt: row.trialEndsAt.toISOString(),
        periodStartsAt: row.periodStartsAt?.toISOString() ?? null,
        paidThrough: row.paidThrough?.toISOString() ?? null,
        pastDueSince: row.pastDueSince?.toISOString() ?? null,
        cancelAtPeriodEnd: row.cancelAtPeriodEnd,
        checkout: row.checkout
      },
      version: row.version,
      reference: row.providerSubscriptionId,
      checkoutUrl: payable?.url ?? null,
      checkoutExpiresAt: payable?.expiresAt.toISOString() ?? null,
      minimumCharge: this.provider.minimumCharge
    }
  }
}
