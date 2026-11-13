import { plans } from '@repo/contracts'
import { BillingProviderUnavailableException } from '#libs/ports/billing-provider.port'
import {
  CheckoutOpenException,
  PlanChangeNotAllowedException,
  SubscriptionChangedException
} from '../../billing.errors'
import { CLAIM_EXPIRES_MS, onTrial, type Subscription } from '../../subscription'
import { billingKit } from '../../testing/billing-kit'
import { subscribed } from '../../testing/subscribed'
import { StartCheckoutService } from './start-checkout.service'

const owner = { kind: 'member', id: 'user-owner' } as const
const trialEndsAt = new Date('2026-11-25T12:00:00.000Z')
const webOrigin = 'http://localhost:5173'
const returnTo = '/acme/settings/billing'

function setUp(now?: Date) {
  const kit = billingKit(now)
  const service = new StartCheckoutService(kit.unitOfWork, kit.provider, kit.clock, kit.ids, webOrigin)
  const checkout = (input: { plan: 'basic' | 'pro'; version: number; method?: 'card' | 'pix' | 'boleto' }) =>
    service.execute('org-1', { method: 'card', returnTo, ...input }, owner, trialEndsAt)
  const kitWithService = { ...kit, service, checkout }
  return { ...kitWithService, subscribed: (overrides: Partial<Subscription> = {}) => subscribed(kit, overrides) }
}

describe('StartCheckoutService (ADR 0063)', () => {
  describe('a first subscription', () => {
    it("opens the provider's page at the plan's full price, and records who started it", async () => {
      const { checkout, subscriptions, entries } = setUp()

      const page = await checkout({ plan: 'pro', version: 0 })

      expect(page).toEqual({ url: `${webOrigin}${returnTo}?checkout=returned` })
      expect(await subscriptions.find('org-1')).toMatchObject({
        status: 'trialing',
        trialEndsAt,
        checkout: { kind: 'subscription', plan: 'pro', amount: plans.pro.price },
        checkoutPage: { id: expect.stringMatching(/^chk_/), url: page.url },
        provider: 'fake',
        customerId: expect.stringMatching(/^cus_/),
        version: 2
      })
      expect(await entries()).toEqual([
        expect.objectContaining({
          actor: owner,
          resourceType: 'subscription',
          resourceId: 'org-1',
          action: 'checkout-started',
          fields: ['checkout']
        })
      ])
    })

    it('gives a second request for the same plan the same page, and refuses another plan', async () => {
      const { checkout } = setUp()
      const first = await checkout({ plan: 'pro', version: 0 })

      expect(await checkout({ plan: 'pro', version: 0 })).toEqual(first)
      await expect(checkout({ plan: 'basic', version: 2 })).rejects.toThrow(CheckoutOpenException)
    })

    it('refuses a request while another is still waiting for the provider', async () => {
      const { checkout, subscriptions, clock } = setUp()
      await subscriptions.save({
        ...onTrial('org-1', trialEndsAt, clock.now()),
        checkout: { kind: 'subscription', plan: 'pro', amount: plans.pro.price }
      })

      await expect(checkout({ plan: 'pro', version: 1 })).rejects.toThrow(CheckoutOpenException)
    })

    it('refuses a request made on a version that moved since', async () => {
      const { checkout } = setUp()

      await expect(checkout({ plan: 'pro', version: 3 })).rejects.toThrow(SubscriptionChangedException)
    })

    it('starts again once a claim was left unanswered for 10 minutes, recording the one dropped', async () => {
      const { checkout, subscriptions, clock, entries } = setUp()
      await subscriptions.save({
        ...onTrial('org-1', trialEndsAt, clock.now()),
        checkout: { kind: 'subscription', plan: 'basic', amount: plans.basic.price }
      })
      clock.advance(CLAIM_EXPIRES_MS)

      await checkout({ plan: 'pro', version: 1 })

      expect((await subscriptions.find('org-1'))?.checkout?.plan).toBe('pro')
      expect((await entries()).map((entry) => entry.action).toSorted()).toEqual([
        'checkout-abandoned',
        'checkout-started'
      ])
    })

    it('withdraws a page that expired at the provider before it opens a new one', async () => {
      const { checkout, provider, subscriptions, clock } = setUp()
      await checkout({ plan: 'basic', version: 0 })
      const expired = (await subscriptions.find('org-1'))?.checkoutPage?.id as string
      clock.advance(30 * 60 * 1000)
      const cancelCheckout = vi.spyOn(provider, 'cancelCheckout')

      await checkout({ plan: 'basic', version: 2 })

      expect(cancelCheckout).toHaveBeenCalledWith(expired)
      expect((await subscriptions.find('org-1'))?.checkoutPage?.id).not.toBe(expired)
    })

    it('releases the claim when the provider is out of reach, so nothing has changed', async () => {
      const { checkout, provider, subscriptions, entries } = setUp()
      provider.failNextCall()

      await expect(checkout({ plan: 'pro', version: 0 })).rejects.toThrow(BillingProviderUnavailableException)

      expect(await subscriptions.find('org-1')).toMatchObject({ checkout: null, checkoutPage: null })
      expect(await entries()).toEqual([])
      expect(await checkout({ plan: 'pro', version: 2 })).toMatchObject({ url: expect.any(String) })
    })

    it('withdraws the page it opened when the owner dropped the claim meanwhile', async () => {
      const { service, provider, subscriptions } = setUp()
      const cancelCheckout = vi.spyOn(provider, 'cancelCheckout')
      vi.spyOn(provider, 'startCheckout').mockImplementationOnce(async (request) => {
        const row = (await subscriptions.find('org-1')) as Subscription
        await subscriptions.save({ ...row, checkout: null })
        return { checkoutId: 'chk_late', url: request.returnUrl, customerId: 'cus_1', expiresAt: new Date() }
      })

      await expect(
        service.execute('org-1', { plan: 'pro', method: 'card', version: 0, returnTo }, owner, trialEndsAt)
      ).rejects.toThrow(SubscriptionChangedException)
      expect(cancelCheckout).toHaveBeenCalledWith('chk_late')
    })

    it('subscribes again while past due, and to the current plan to change how to pay', async () => {
      const late = setUp()
      await late.subscribed({ status: 'past_due', pastDueSince: new Date('2026-11-10T12:00:00.000Z') })
      const same = setUp()
      await same.subscribed()

      await late.checkout({ plan: 'basic', version: 1 })
      await same.checkout({ plan: 'basic', version: 1, method: 'boleto' })

      expect((await late.subscriptions.find('org-1'))?.checkout?.kind).toBe('subscription')
      expect((await same.subscriptions.find('org-1'))?.checkout).toEqual({
        kind: 'subscription',
        plan: 'basic',
        amount: plans.basic.price
      })
    })
  })

  describe('an upgrade', () => {
    it('opens a payment of the difference for the days left: 12 of 30 days, R$ 20.00', async () => {
      const { checkout, provider, subscriptions, entries, subscribed } = setUp()
      const row = await subscribed()
      const startPayment = vi.spyOn(provider, 'startPayment')

      const page = await checkout({ plan: 'pro', version: row.version, method: 'pix' })

      expect(startPayment).toHaveBeenCalledWith({
        organizationId: 'org-1',
        customerId: row.customerId,
        amount: { amount: 2000, currency: 'BRL' },
        description: 'Upgrade from basic to pro until 2026-12-01',
        method: 'pix',
        returnUrl: page.url,
        cancelUrl: `${webOrigin}${returnTo}?checkout=cancelled`
      })
      expect(await subscriptions.find('org-1')).toMatchObject({
        plan: 'basic',
        checkout: { kind: 'upgrade', plan: 'pro', amount: { amount: 2000, currency: 'BRL' } }
      })
      expect((await entries()).map((entry) => entry.action)).toEqual(['upgrade-started'])
    })

    it("changes the plan at once, and for free, below the provider's minimum: 2 days left", async () => {
      const { checkout, provider, subscriptions, entries, subscribed } = setUp(new Date('2026-11-29T12:00:00.000Z'))
      const row = await subscribed({ nextPlan: null })
      const startPayment = vi.spyOn(provider, 'startPayment')

      expect(await checkout({ plan: 'pro', version: row.version })).toEqual({ url: null })

      expect(startPayment).not.toHaveBeenCalled()
      expect(await provider.subscription(row.providerSubscriptionId as string)).toMatchObject({
        price: plans.pro.price
      })
      expect(await subscriptions.find('org-1')).toMatchObject({ plan: 'pro', checkout: null })
      expect(await entries()).toEqual([expect.objectContaining({ action: 'plan-changed', fields: ['plan'] })])
    })

    it('refuses a cheaper plan, which waits for the end of the period', async () => {
      const { checkout, subscribed } = setUp()
      const row = await subscribed({ plan: 'pro' })

      await expect(checkout({ plan: 'basic', version: row.version })).rejects.toThrow(PlanChangeNotAllowedException)
    })
  })
})
