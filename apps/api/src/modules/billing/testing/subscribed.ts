import type { Subscription } from '../subscription'
import type { billingKit } from './billing-kit'
import { aSubscription } from './subscription-repository.contract'

/** When the subscription starts, at the fake and on the row alike. */
const periodStart = new Date('2026-11-01T12:00:00.000Z')

/**
 * Basic, subscribed through the kit's fake and kept on the row: 1 November to 1 December 2026, so 12
 * of 30 days are left on the kit's 19 November. The fake subscribes on 1 November, then the clock comes
 * back to where it was.
 */
export async function subscribed(
  kit: ReturnType<typeof billingKit>,
  overrides: Partial<Subscription> = {},
  organizationId = 'org-1'
): Promise<Subscription> {
  const back = kit.clock.now().getTime() - periodStart.getTime()
  kit.clock.advance(-back)
  const { customerId } = await kit.provider.startCheckout({
    organizationId,
    plan: overrides.plan ?? 'basic',
    method: 'card',
    customerId: null,
    returnUrl: 'http://localhost:5173/back',
    cancelUrl: 'http://localhost:5173/left'
  })
  const { subscriptionId } = await kit.command('checkout.complete', organizationId)
  kit.clock.advance(back)
  return kit.subscriptions.save(
    aSubscription(organizationId, {
      periodStartsAt: periodStart,
      paidThrough: new Date('2026-12-01T12:00:00.000Z'),
      customerId,
      providerSubscriptionId: subscriptionId as string,
      ...overrides
    })
  )
}
