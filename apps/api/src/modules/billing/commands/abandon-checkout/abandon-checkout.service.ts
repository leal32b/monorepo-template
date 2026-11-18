import type { AuditActor } from '#libs/ports/audit-trail.port'
import type { BillingProvider } from '#libs/ports/billing-provider.port'
import type { Clock } from '#libs/ports/clock.port'
import type { IdGenerator } from '#libs/ports/id-generator.port'
import { CheckoutPaidException } from '../../billing.errors'
import type { BillingUnitOfWork } from '../../billing-unit-of-work.port'
import { clearCheckout, openCheckoutOf } from '../../subscription'
import { readSubscription, writeChange } from '../../subscription-changes'

/**
 * "Cancel the upgrade", or leaving a first checkout unpaid (ADR 0063): the page is withdrawn at the
 * provider, so it cannot take money later, and the checkout is dropped; nothing was charged. A payment
 * already made is not dropped: the plan changes when the provider confirms it. With no checkout open,
 * nothing happens.
 */
export class AbandonCheckoutService {
  constructor(
    private readonly unitOfWork: BillingUnitOfWork,
    private readonly provider: BillingProvider,
    private readonly clock: Clock,
    private readonly ids: IdGenerator
  ) {}

  async execute(organizationId: string, actor: AuditActor, trialEndsAt: Date): Promise<void> {
    const now = this.clock.now()
    const read = await readSubscription(this.unitOfWork, organizationId, trialEndsAt, now)
    if (openCheckoutOf(read, now) === 'none') return
    if (read.checkoutPage !== null) {
      if ((await this.provider.payment(read.checkoutPage.id)) === 'paid') throw new CheckoutPaidException()
      await this.provider.cancelCheckout(read.checkoutPage.id)
    }
    await writeChange({ unitOfWork: this.unitOfWork, ids: this.ids }, read, {
      next: (current) => clearCheckout(current, now),
      action: read.checkout?.kind === 'upgrade' ? 'upgrade-abandoned' : 'checkout-abandoned',
      actor,
      at: now
    })
  }
}
