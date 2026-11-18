import type { BillingPage } from '@repo/contracts'
import type { BillingProvider } from '#libs/ports/billing-provider.port'
import type { Clock } from '#libs/ports/clock.port'
import type { BillingUnitOfWork } from '../../billing-unit-of-work.port'
import { readSubscription } from '../../subscription-changes'

/**
 * "Pay now" and "Change payment" (ADR 0063): the provider's page for what is overdue, or null when it
 * has none or the organization has no subscription there, so the screen offers a checkout instead.
 */
export class GetPaymentPageService {
  constructor(
    private readonly unitOfWork: BillingUnitOfWork,
    private readonly provider: BillingProvider,
    private readonly clock: Clock
  ) {}

  async execute(organizationId: string, trialEndsAt: Date): Promise<BillingPage> {
    const row = await readSubscription(this.unitOfWork, organizationId, trialEndsAt, this.clock.now())
    if (row.providerSubscriptionId === null) return { url: null }
    return { url: await this.provider.paymentPage(row.providerSubscriptionId) }
  }
}
