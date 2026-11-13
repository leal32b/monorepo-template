import { plans } from '@repo/contracts'
import { HttpProblem } from '#libs/http/problem'
import { type BillingNotice, BillingProviderUnavailableException } from '#libs/ports/billing-provider.port'
import { WebhookRefused } from '#libs/ports/webhook-reader.port'
import { FakeBillingProvider } from './fake-billing-provider'
import { FixedClock } from './fixed-clock'
import { ManualTimer } from './manual-timer'

const token = 'fake-billing-token-for-tests'
const minute = 60 * 1000
const back = { returnUrl: 'http://localhost:5173/acme/settings/billing?checkout=returned', cancelUrl: 'http://x/c' }

let sequence = 0
const ids = { generate: () => `id${++sequence}` }

function setUp(options: { token?: string | undefined } = {}) {
  const clock = new FixedClock(new Date('2026-11-04T12:00:00.000Z'))
  const provider = new FakeBillingProvider({ clock, ids, token: 'token' in options ? options.token : token })
  /** A command as a test or the end-to-end suite sends it to `POST /api/webhooks/fake`. */
  const command = (body: unknown, header: string | null = token) =>
    provider.readWebhook(
      Buffer.from(JSON.stringify(body)),
      header === null ? {} : { 'fake-billing-token': header }
    ) as Promise<BillingNotice>
  const subscribe = async (organizationId = 'org-1') => {
    const checkout = await provider.startCheckout({
      organizationId,
      plan: 'basic',
      method: 'card',
      customerId: null,
      ...back
    })
    const notice = await command({ command: 'checkout.complete', organizationId })
    return { checkout, notice, subscriptionId: notice.subscriptionId as string }
  }
  return { clock, provider, command, subscribe }
}

describe('FakeBillingProvider (ADR 0063)', () => {
  it('is named fake, and declares the minimum charge of the first real provider', () => {
    const { provider } = setUp()

    expect(provider.name).toBe('fake')
    expect(provider.minimumCharge).toEqual({ amount: 500, currency: 'BRL' })
  })

  describe('a first subscription', () => {
    it('opens a checkout whose page is the return URL itself, with a customer of its own, for 30 minutes', async () => {
      const { provider } = setUp()

      const checkout = await provider.startCheckout({
        organizationId: 'org-1',
        plan: 'basic',
        method: 'pix',
        customerId: null,
        ...back
      })

      expect(checkout).toEqual({
        checkoutId: expect.stringMatching(/^chk_/),
        url: back.returnUrl,
        customerId: expect.stringMatching(/^cus_/),
        expiresAt: new Date('2026-11-04T12:30:00.000Z')
      })
      expect(await provider.payment(checkout.checkoutId)).toBe('open')
    })

    it('reuses the customer it is given', async () => {
      const { provider } = setUp()
      const first = await provider.startCheckout({
        organizationId: 'org-1',
        plan: 'basic',
        method: 'card',
        customerId: null,
        ...back
      })

      const second = await provider.startCheckout({
        organizationId: 'org-1',
        plan: 'pro',
        method: 'card',
        customerId: first.customerId,
        ...back
      })

      expect(second.customerId).toBe(first.customerId)
    })

    it('finds the customer whose reference is the organization when the row holds none', async () => {
      const { provider } = setUp()
      const first = await provider.startCheckout({
        organizationId: 'org-1',
        plan: 'basic',
        method: 'card',
        customerId: null,
        ...back
      })

      const again = await provider.startCheckout({
        organizationId: 'org-1',
        plan: 'basic',
        method: 'card',
        customerId: null,
        ...back
      })
      const other = await provider.startCheckout({
        organizationId: 'org-2',
        plan: 'basic',
        method: 'card',
        customerId: null,
        ...back
      })

      expect(again.customerId).toBe(first.customerId)
      expect(other.customerId).not.toBe(first.customerId)
    })

    it('completes on checkout.complete: active, paid for a month, at the plan’s price', async () => {
      const { provider, subscribe } = setUp()

      const { checkout, notice, subscriptionId } = await subscribe()

      expect(notice).toEqual({
        eventId: expect.stringMatching(/^evt_/),
        checkoutId: checkout.checkoutId,
        subscriptionId: expect.stringMatching(/^sub_/),
        customerId: checkout.customerId
      })
      expect(await provider.payment(checkout.checkoutId)).toBe('paid')
      expect(await provider.subscription(subscriptionId)).toEqual({
        subscriptionId,
        customerId: checkout.customerId,
        reference: 'org-1',
        status: 'active',
        periodStart: new Date('2026-11-04T12:00:00.000Z'),
        paidThrough: new Date('2026-12-04T12:00:00.000Z'),
        overdueSince: null,
        cancelAtPeriodEnd: false,
        price: plans.basic.price
      })
    })

    it('charges nothing on checkout.abandon, and the checkout can no longer be paid', async () => {
      const { provider, command } = setUp()
      const checkout = await provider.startCheckout({
        organizationId: 'org-1',
        plan: 'basic',
        method: 'card',
        customerId: null,
        ...back
      })

      const notice = await command({ command: 'checkout.abandon', organizationId: 'org-1' })

      expect(notice).toEqual({
        eventId: expect.any(String),
        checkoutId: checkout.checkoutId,
        customerId: checkout.customerId
      })
      expect(await provider.payment(checkout.checkoutId)).toBe('expired')
    })

    it('lets a checkout expire after its 30 minutes, and knows no checkout it never opened', async () => {
      const { clock, provider } = setUp()
      const checkout = await provider.startCheckout({
        organizationId: 'org-1',
        plan: 'basic',
        method: 'card',
        customerId: null,
        ...back
      })

      clock.advance(30 * minute)

      expect(await provider.payment(checkout.checkoutId)).toBe('expired')
      expect(await provider.payment('chk_unknown')).toBe('expired')
    })

    it('withdraws an open checkout, and leaves a paid one as it is', async () => {
      const { provider, subscribe } = setUp()
      const open = await provider.startCheckout({
        organizationId: 'org-2',
        plan: 'basic',
        method: 'card',
        customerId: null,
        ...back
      })
      const { checkout: paid } = await subscribe()

      await provider.cancelCheckout(open.checkoutId)
      await provider.cancelCheckout(paid.checkoutId)
      await provider.cancelCheckout('chk_unknown')

      expect(await provider.payment(open.checkoutId)).toBe('expired')
      expect(await provider.payment(paid.checkoutId)).toBe('paid')
    })
  })

  describe("an upgrade's payment", () => {
    it('opens a page for the amount, and checkout.complete pays it, naming no subscription', async () => {
      const { provider, command, subscribe } = setUp()
      const { checkout: first } = await subscribe()

      const payment = await provider.startPayment({
        organizationId: 'org-1',
        customerId: first.customerId,
        amount: { amount: 2000, currency: 'BRL' },
        description: 'Upgrade to pro',
        method: 'boleto',
        ...back
      })
      const notice = await command({ command: 'checkout.complete', organizationId: 'org-1' })

      expect(payment).toEqual({ checkoutId: expect.any(String), url: back.returnUrl, expiresAt: expect.any(Date) })
      expect(notice).toEqual({
        eventId: expect.any(String),
        checkoutId: payment.checkoutId,
        customerId: first.customerId
      })
      expect(await provider.payment(payment.checkoutId)).toBe('paid')
    })

    it('refuses a customer it does not hold', async () => {
      const { provider } = setUp()

      await expect(
        provider.startPayment({
          organizationId: 'org-1',
          customerId: 'cus_unknown',
          amount: { amount: 2000, currency: 'BRL' },
          description: 'Upgrade to pro',
          method: 'card',
          ...back
        })
      ).rejects.toThrow('unknown customer')
    })
  })

  describe('a subscription over time', () => {
    it('goes past due from now on payment.fail, and is paid for a month from now on payment.recover', async () => {
      const { clock, provider, command, subscribe } = setUp()
      const { subscriptionId } = await subscribe()

      await command({ command: 'payment.fail', organizationId: 'org-1' })
      expect(await provider.subscription(subscriptionId)).toMatchObject({
        status: 'past_due',
        overdueSince: new Date('2026-11-04T12:00:00.000Z')
      })

      clock.advance(3 * 24 * 60 * minute)
      const notice = await command({ command: 'payment.recover', organizationId: 'org-1' })

      expect(notice).toEqual({ eventId: expect.any(String), subscriptionId, customerId: expect.any(String) })
      expect(await provider.subscription(subscriptionId)).toMatchObject({
        status: 'active',
        overdueSince: null,
        periodStart: new Date('2026-11-07T12:00:00.000Z'),
        paidThrough: new Date('2026-12-07T12:00:00.000Z')
      })
    })

    it('renews on period.renew for the next month, at the price set by changePlan', async () => {
      const { provider, command, subscribe } = setUp()
      const { subscriptionId } = await subscribe()

      await provider.changePlan(subscriptionId, 'pro')
      await command({ command: 'period.renew', organizationId: 'org-1' })

      expect(await provider.subscription(subscriptionId)).toMatchObject({
        status: 'active',
        periodStart: new Date('2026-12-04T12:00:00.000Z'),
        paidThrough: new Date('2027-01-04T12:00:00.000Z'),
        price: plans.pro.price
      })
    })

    it('ends at the renewal when a cancellation is scheduled, and not when it was withdrawn', async () => {
      const { provider, command, subscribe } = setUp()
      const ended = await subscribe('org-1')
      const kept = await subscribe('org-2')

      await provider.cancel(ended.subscriptionId, { atPeriodEnd: true })
      await provider.cancel(kept.subscriptionId, { atPeriodEnd: true })
      expect(await provider.subscription(ended.subscriptionId)).toMatchObject({
        status: 'active',
        cancelAtPeriodEnd: true
      })
      await provider.resume(kept.subscriptionId)
      await command({ command: 'period.renew', organizationId: 'org-1' })
      await command({ command: 'period.renew', organizationId: 'org-2' })

      expect(await provider.subscription(ended.subscriptionId)).toMatchObject({ status: 'cancelled' })
      expect(await provider.subscription(kept.subscriptionId)).toMatchObject({
        status: 'active',
        cancelAtPeriodEnd: false
      })
    })

    it('ends now on cancel, and on subscription.cancel', async () => {
      const { provider, command, subscribe } = setUp()
      const first = await subscribe('org-1')
      const second = await subscribe('org-2')

      await provider.cancel(first.subscriptionId, { atPeriodEnd: false })
      await command({ command: 'subscription.cancel', organizationId: 'org-2' })

      expect(await provider.subscription(first.subscriptionId)).toMatchObject({ status: 'cancelled' })
      expect(await provider.subscription(second.subscriptionId)).toMatchObject({ status: 'cancelled' })
    })

    it('has no page for what is overdue, and knows no subscription it never created', async () => {
      const { provider, subscribe } = setUp()
      const { subscriptionId } = await subscribe()

      expect(await provider.paymentPage(subscriptionId)).toBeNull()
      expect(await provider.subscription('sub_unknown')).toBeNull()
      await expect(provider.changePlan('sub_unknown', 'pro')).rejects.toThrow('unknown subscription')
    })
  })

  describe('commands through its webhook route', () => {
    it('refuses a missing or wrong token, before reading the body', async () => {
      const { command } = setUp()

      await expect(command('not json', null)).rejects.toThrow(WebhookRefused)
      await expect(command('not json', 'wrong')).rejects.toThrow(WebhookRefused)
      await expect(command('not json', `${token}x`)).rejects.toThrow(WebhookRefused)
    })

    it('refuses every command while no token is configured', async () => {
      const { command } = setUp({ token: undefined })

      await expect(command({ command: 'checkout.complete', organizationId: 'org-1' })).rejects.toThrow(
        new WebhookRefused('no token configured')
      )
    })

    it('answers a body that is no command with a 400 that says so', async () => {
      const { provider, command } = setUp()

      await expect(command({ command: 'refund.all', organizationId: 'org-1' })).rejects.toThrow(HttpProblem)
      await expect(provider.readWebhook(Buffer.from('{'), { 'fake-billing-token': token })).rejects.toMatchObject({
        status: 400,
        code: 'validation_failed'
      })
    })

    it('answers a command with nothing to act on with a 409', async () => {
      const { command } = setUp()

      await expect(command({ command: 'checkout.complete', organizationId: 'org-1' })).rejects.toMatchObject({
        status: 409,
        code: 'fake_billing_nothing_to_act_on'
      })
      await expect(command({ command: 'payment.fail', organizationId: 'org-1' })).rejects.toMatchObject({ status: 409 })
    })

    it('sends a notice again, unchanged, for an event id it has already sent, so a test can send a repeat', async () => {
      const { provider, command } = setUp()
      await provider.startCheckout({
        organizationId: 'org-1',
        plan: 'basic',
        method: 'card',
        customerId: null,
        ...back
      })

      const first = await command({ command: 'checkout.complete', organizationId: 'org-1', eventId: 'evt_repeat' })
      const repeat = await command({ command: 'checkout.complete', organizationId: 'org-1', eventId: 'evt_repeat' })

      expect(first.eventId).toBe('evt_repeat')
      expect(repeat).toEqual(first)
    })
  })

  describe('in tests only', () => {
    it('fails its next call as an outage would, then works again', async () => {
      const { provider, subscribe } = setUp()
      const { subscriptionId } = await subscribe()

      provider.failNextCall()

      await expect(provider.subscription(subscriptionId)).rejects.toThrow(BillingProviderUnavailableException)
      await expect(provider.subscription(subscriptionId)).resolves.toMatchObject({ status: 'active' })
    })
  })

  describe('in development (autoComplete)', () => {
    it('completes a checkout by itself after a few seconds, and hands the notice to whoever listens', async () => {
      const clock = new FixedClock(new Date('2026-11-04T12:00:00.000Z'))
      const timer = new ManualTimer(clock)
      const provider = new FakeBillingProvider({ clock, ids, token: undefined, autoComplete: { afterMs: 3000, timer } })
      const notices: BillingNotice[] = []
      provider.listen(async (notice) => {
        notices.push(notice)
      })
      const checkout = await provider.startCheckout({
        organizationId: 'org-1',
        plan: 'basic',
        method: 'card',
        customerId: null,
        ...back
      })
      const payment = await provider.startPayment({
        organizationId: 'org-1',
        customerId: checkout.customerId,
        amount: { amount: 2000, currency: 'BRL' },
        description: 'Upgrade',
        method: 'card',
        ...back
      })

      timer.advance(3000)

      await vi.waitFor(() => expect(notices).toHaveLength(2))
      expect(await provider.payment(checkout.checkoutId)).toBe('paid')
      expect(await provider.payment(payment.checkoutId)).toBe('paid')
    })

    it('leaves a checkout withdrawn meanwhile, or with nobody listening, as it is', async () => {
      const clock = new FixedClock(new Date('2026-11-04T12:00:00.000Z'))
      const timer = new ManualTimer(clock)
      const provider = new FakeBillingProvider({ clock, ids, token: undefined, autoComplete: { afterMs: 3000, timer } })
      const withdrawn = await provider.startCheckout({
        organizationId: 'org-1',
        plan: 'basic',
        method: 'card',
        customerId: null,
        ...back
      })
      await provider.cancelCheckout(withdrawn.checkoutId)
      const unheard = await provider.startCheckout({
        organizationId: 'org-2',
        plan: 'basic',
        method: 'card',
        customerId: null,
        ...back
      })

      timer.advance(3000)

      await vi.waitFor(async () => expect(await provider.payment(unheard.checkoutId)).toBe('paid'))
      expect(await provider.payment(withdrawn.checkoutId)).toBe('expired')
    })

    it('keeps going when the listener fails: the checkout is paid, and a command can send its notice again', async () => {
      const clock = new FixedClock(new Date('2026-11-04T12:00:00.000Z'))
      const timer = new ManualTimer(clock)
      const provider = new FakeBillingProvider({ clock, ids, token: undefined, autoComplete: { afterMs: 3000, timer } })
      const failed = vi.fn(async () => {
        throw new Error('database down')
      })
      provider.listen(failed)
      const checkout = await provider.startCheckout({
        organizationId: 'org-1',
        plan: 'basic',
        method: 'card',
        customerId: null,
        ...back
      })

      timer.advance(3000)

      await vi.waitFor(() => expect(failed).toHaveBeenCalled())
      expect(await provider.payment(checkout.checkoutId)).toBe('paid')
    })
  })
})
