import { plans } from '@repo/contracts'
import { CheckoutPaidException } from '../../billing.errors'
import { onTrial } from '../../subscription'
import { billingKit } from '../../testing/billing-kit'
import { subscribed } from '../../testing/subscribed'
import { StartCheckoutService } from '../start-checkout/start-checkout.service'
import { AbandonCheckoutService } from './abandon-checkout.service'

const owner = { kind: 'member', id: 'user-owner' } as const
const trialEndsAt = new Date('2026-11-25T12:00:00.000Z')

function setUp() {
  const kit = billingKit()
  const start = new StartCheckoutService(kit.unitOfWork, kit.provider, kit.clock, kit.ids, 'http://localhost:5173')
  const service = new AbandonCheckoutService(kit.unitOfWork, kit.provider, kit.clock, kit.ids)
  const checkout = (plan: 'basic' | 'pro', version: number) =>
    start.execute('org-1', { plan, method: 'card', version, returnTo: '/acme/settings/billing' }, owner, trialEndsAt)
  return { ...kit, checkout, abandon: () => service.execute('org-1', owner, trialEndsAt) }
}

describe('AbandonCheckoutService (ADR 0063)', () => {
  it("drops an upgrade's payment and withdraws its page, so it cannot take money later", async () => {
    const kit = setUp()
    const row = await subscribed(kit)
    await kit.checkout('pro', row.version)
    const page = (await kit.subscriptions.find('org-1'))?.checkoutPage?.id as string

    await kit.abandon()

    expect(await kit.provider.payment(page)).toBe('expired')
    expect(await kit.subscriptions.find('org-1')).toMatchObject({ plan: 'basic', checkout: null, checkoutPage: null })
    expect((await kit.entries())[0]).toMatchObject({ actor: owner, action: 'upgrade-abandoned', fields: ['checkout'] })
  })

  it('drops a first checkout as a subscription not paid', async () => {
    const kit = setUp()
    await kit.checkout('pro', 0)

    await kit.abandon()

    expect((await kit.entries())[0]).toMatchObject({ action: 'checkout-abandoned' })
  })

  it('drops a claim the provider never answered, with nothing to withdraw', async () => {
    const kit = setUp()
    await kit.subscriptions.save({
      ...onTrial('org-1', trialEndsAt, kit.clock.now()),
      checkout: { kind: 'subscription', plan: 'pro', amount: plans.pro.price }
    })
    const cancelCheckout = vi.spyOn(kit.provider, 'cancelCheckout')

    await kit.abandon()

    expect(cancelCheckout).not.toHaveBeenCalled()
    expect((await kit.subscriptions.find('org-1'))?.checkout).toBeNull()
  })

  it('refuses to drop a payment already made: the plan changes when the provider confirms it', async () => {
    const kit = setUp()
    await kit.checkout('pro', 0)
    await kit.command('checkout.complete')

    await expect(kit.abandon()).rejects.toThrow(CheckoutPaidException)
    expect((await kit.subscriptions.find('org-1'))?.checkout).not.toBeNull()
  })

  it('does nothing with no checkout open', async () => {
    const kit = setUp()

    await kit.abandon()

    expect(await kit.subscriptions.find('org-1')).toBeNull()
  })
})
