import type { BillingCheckoutInput, BillingPage } from '@repo/contracts'
import type { AuditActor } from '#libs/ports/audit-trail.port'
import type { BillingProvider, Checkout } from '#libs/ports/billing-provider.port'
import type { Clock } from '#libs/ports/clock.port'
import type { IdGenerator } from '#libs/ports/id-generator.port'
import { CheckoutOpenException, SubscriptionChangedException } from '../../billing.errors'
import { subscriptionEntry } from '../../billing-audit'
import type { BillingUnitOfWork } from '../../billing-unit-of-work.port'
import {
  changedFields,
  changePlanNow,
  claimCheckout,
  clearCheckout,
  decideCheckout,
  onTrial,
  openCheckoutOf,
  type Subscription,
  storeCheckout
} from '../../subscription'
import { readSubscription } from '../../subscription-changes'

/** The audit action of dropping a checkout, by what it was for. */
const abandoned = (subscription: Subscription) =>
  subscription.checkout?.kind === 'upgrade' ? 'upgrade-abandoned' : 'checkout-abandoned'

/**
 * Choosing a plan through the checkout (ADR 0063): a subscription at the plan's full price, or an
 * upgrade that pays the difference for the days left, on the provider's page; or, below the provider's
 * minimum charge, the upgrade at once and for free. One checkout per organization: a second request
 * for the same plan gets its page back, one for another plan is refused until it is paid or dropped.
 * The checkout is claimed on the row with the version read before the provider is called, outside any
 * transaction (ADR 0052), and its page stored after; a provider that fails releases the claim, so
 * nothing has changed. A checkout whose page expired, or whose claim was left by a process that died,
 * is withdrawn at the provider and dropped first.
 */
export class StartCheckoutService {
  constructor(
    private readonly unitOfWork: BillingUnitOfWork,
    private readonly provider: BillingProvider,
    private readonly clock: Clock,
    private readonly ids: IdGenerator,
    private readonly webOrigin: string
  ) {}

  async execute(
    organizationId: string,
    { plan, method, version, returnTo, payer }: BillingCheckoutInput,
    actor: AuditActor,
    trialEndsAt: Date
  ): Promise<BillingPage> {
    const now = this.clock.now()
    const read = await readSubscription(this.unitOfWork, organizationId, trialEndsAt, now)
    const open = openCheckoutOf(read, now)
    if (open === 'payable' && read.checkout?.plan === plan) return { url: read.checkoutPage?.url as string }
    if (open === 'payable' || open === 'opening') throw new CheckoutOpenException()
    if (read.version !== version) throw new SubscriptionChangedException()
    const decision = decideCheckout(read, plan, now, this.provider.minimumCharge)

    // The provider first, so a failure leaves the row as it was.
    if (open === 'lapsed' && read.checkoutPage !== null) await this.provider.cancelCheckout(read.checkoutPage.id)
    if (decision.kind === 'free-upgrade') await this.provider.changePlan(read.providerSubscriptionId as string, plan)

    const claimed = await this.unitOfWork.run(organizationId, async ({ subscriptions, audit }) => {
      const current = (await subscriptions.find(organizationId)) ?? onTrial(organizationId, trialEndsAt, now)
      if (current.version !== read.version) throw new SubscriptionChangedException()
      const record = (
        before: Subscription,
        after: Subscription,
        action: Parameters<typeof subscriptionEntry>[1]['action']
      ) =>
        audit.record(
          subscriptionEntry(organizationId, {
            id: this.ids.generate(),
            at: now,
            actor,
            action,
            fields: changedFields(before, after)
          })
        )
      let base = current
      if (open === 'lapsed') {
        base = clearCheckout(current, now)
        await record(current, base, abandoned(current))
      }
      if (decision.kind === 'free-upgrade') {
        const changed = changePlanNow(base, plan, now)
        await record(base, changed, 'plan-changed')
        await subscriptions.save(changed)
        return null
      }
      return subscriptions.save(claimCheckout(base, { kind: decision.kind, plan, amount: decision.amount }, now))
    })
    if (claimed === null) return { url: null }

    const back = { returnUrl: this.#back(returnTo, 'returned'), cancelUrl: this.#back(returnTo, 'cancelled') }
    let page: Checkout & { customerId?: string }
    try {
      page =
        claimed.checkout?.kind === 'upgrade'
          ? await this.provider.startPayment({
              organizationId,
              customerId: claimed.customerId as string,
              amount: claimed.checkout.amount,
              description: `Upgrade from ${claimed.plan} to ${plan} until ${claimed.paidThrough?.toISOString().slice(0, 10)}`,
              method,
              ...back
            })
          : await this.provider.startCheckout({
              organizationId,
              plan,
              method,
              customerId: claimed.customerId,
              payer,
              ...back
            })
    } catch (error) {
      await this.#release(organizationId, claimed, now)
      throw error
    }
    await this.#store(organizationId, claimed, page, actor, now)
    return { url: page.url }
  }

  /** The plan page of the web, with how the owner came back. */
  #back(returnTo: string, checkout: 'returned' | 'cancelled'): string {
    return `${this.webOrigin}${returnTo}?checkout=${checkout}`
  }

  /**
   * Whether the row still holds this request's claim, whatever else moved its version since (a notice
   * may have renewed the period): a claim waiting for its page, for the same checkout.
   */
  #holdsClaim(current: Subscription | null, claimed: Subscription): current is Subscription {
    return (
      current !== null &&
      current.checkoutPage === null &&
      JSON.stringify(current.checkout) === JSON.stringify(claimed.checkout)
    )
  }

  async #release(organizationId: string, claimed: Subscription, now: Date): Promise<void> {
    await this.unitOfWork.run(organizationId, async ({ subscriptions }) => {
      const current = await subscriptions.find(organizationId)
      if (this.#holdsClaim(current, claimed)) await subscriptions.save(clearCheckout(current, now))
    })
  }

  /**
   * The page the provider opened, stored on the claim with its audit entry. When the claim is gone
   * meanwhile (the owner dropped it), the page is withdrawn, and the request is refused as stale.
   */
  async #store(
    organizationId: string,
    claimed: Subscription,
    page: Checkout & { customerId?: string },
    actor: AuditActor,
    now: Date
  ): Promise<void> {
    const stored = await this.unitOfWork.run(organizationId, async ({ subscriptions, audit }) => {
      const current = await subscriptions.find(organizationId)
      if (!this.#holdsClaim(current, claimed)) return false
      const next = storeCheckout(
        current,
        {
          page: { id: page.checkoutId, url: page.url, expiresAt: page.expiresAt },
          provider: this.provider.name,
          customerId: page.customerId ?? (current.customerId as string)
        },
        now
      )
      await audit.record(
        subscriptionEntry(organizationId, {
          id: this.ids.generate(),
          at: now,
          actor,
          action: claimed.checkout?.kind === 'upgrade' ? 'upgrade-started' : 'checkout-started',
          fields: changedFields(claimed, next)
        })
      )
      await subscriptions.save(next)
      return true
    })
    if (stored) return
    await this.provider.cancelCheckout(page.checkoutId)
    throw new SubscriptionChangedException()
  }
}
