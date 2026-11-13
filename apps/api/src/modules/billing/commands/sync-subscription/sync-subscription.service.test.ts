import { plans } from '@repo/contracts'
import { memoryLogger } from '#libs/jobs/testing/memory-logger'
import type { BillingNotice } from '#libs/ports/billing-provider.port'
import { SubscriptionChangedException } from '../../billing.errors'
import { onTrial } from '../../subscription'
import { billingKit } from '../../testing/billing-kit'
import { subscribed } from '../../testing/subscribed'
import { StartCheckoutService } from '../start-checkout/start-checkout.service'
import { SyncSubscriptionService } from './sync-subscription.service'

const owner = { kind: 'member', id: 'user-owner' } as const
const trialEndsAt = new Date('2026-11-25T12:00:00.000Z')
const day = 24 * 60 * 60 * 1000

function setUp(now?: Date) {
  const kit = billingKit(now)
  const { logger, lines } = memoryLogger()
  const service = new SyncSubscriptionService({ ...kit, directory: kit.subscriptions, logger })
  const start = new StartCheckoutService(kit.unitOfWork, kit.provider, kit.clock, kit.ids, 'http://localhost:5173')
  const checkout = (plan: 'basic' | 'pro', version: number, organizationId = 'org-1') =>
    start.execute(
      organizationId,
      { plan, method: 'card', version, returnTo: '/acme/settings/billing' },
      owner,
      trialEndsAt
    )
  /** Sends the fake a command, then runs the job its notice would enqueue. */
  const notify = async (command: string, organizationId = 'org-1') => {
    const notice = (await kit.command(command, organizationId)) as BillingNotice
    await service.execute({ provider: 'fake', ...notice })
    return notice
  }
  const row = (organizationId = 'org-1') => kit.subscriptions.find(organizationId)
  const actions = async () => (await kit.entries()).map((entry) => entry.action).reverse()
  return { ...kit, service, checkout, notify, row, actions, lines }
}

describe('SyncSubscriptionService (ADR 0063)', () => {
  it('completes a first checkout: the organization is active on the plan chosen, by the system', async () => {
    const kit = setUp()
    await kit.checkout('pro', 0)

    const notice = await kit.notify('checkout.complete')

    expect(await kit.row()).toMatchObject({
      status: 'active',
      plan: 'pro',
      providerSubscriptionId: notice.subscriptionId,
      periodStartsAt: kit.clock.now(),
      paidThrough: new Date('2026-12-19T12:00:00.000Z'),
      checkout: null,
      checkoutPage: null
    })
    expect((await kit.entries())[0]).toMatchObject({
      actor: { kind: 'system' },
      action: 'activated',
      fields: ['status', 'plan', 'periodStartsAt', 'paidThrough', 'checkout']
    })
  })

  it('drops a first checkout abandoned at the provider: nothing was charged', async () => {
    const kit = setUp()
    await kit.checkout('pro', 0)

    await kit.notify('checkout.abandon')

    expect(await kit.row()).toMatchObject({ status: 'trialing', checkout: null })
    expect(await kit.actions()).toEqual(['checkout-started', 'checkout-abandoned'])
  })

  it('goes past due on a failed payment, and active again on its recovery', async () => {
    const kit = setUp()
    await kit.checkout('basic', 0)
    await kit.notify('checkout.complete')

    await kit.notify('payment.fail')
    expect(await kit.row()).toMatchObject({ status: 'past_due', pastDueSince: kit.clock.now() })

    kit.clock.advance(20 * day)
    await kit.notify('payment.recover')

    expect(await kit.row()).toMatchObject({ status: 'active', pastDueSince: null, periodStartsAt: kit.clock.now() })
    expect(await kit.actions()).toEqual(['checkout-started', 'activated', 'payment-failed', 'payment-recovered'])
  })

  it('completes an upgrade once its payment is paid: the next charges cost the new plan, then the plan changes', async () => {
    const kit = setUp()
    const row = await subscribed(kit)
    await kit.checkout('pro', row.version)

    await kit.notify('checkout.complete')

    expect(await kit.row()).toMatchObject({ plan: 'pro', checkout: null })
    expect(await kit.provider.subscription(row.providerSubscriptionId as string)).toMatchObject({
      price: plans.pro.price
    })
    expect(await kit.actions()).toEqual(['upgrade-started', 'plan-changed'])
  })

  it("keeps the plan when an upgrade's payment is abandoned, and nothing was charged", async () => {
    const kit = setUp()
    const row = await subscribed(kit)
    await kit.checkout('pro', row.version)

    await kit.notify('checkout.abandon')

    expect(await kit.row()).toMatchObject({ plan: 'basic', checkout: null })
    expect(await kit.actions()).toEqual(['upgrade-started', 'upgrade-abandoned'])
  })

  it("withdraws an upgrade's payment still open when the paid period ended: its days are gone", async () => {
    // 5 days left: R$ 8.33, above the minimum, so a payment opens.
    const kit = setUp(new Date('2026-11-26T12:00:00.000Z'))
    const row = await subscribed(kit)
    await kit.checkout('pro', row.version)
    const page = (await kit.row())?.checkoutPage?.id as string

    kit.clock.advance(5 * day + 1)
    await kit.notify('period.renew')

    expect(await kit.provider.payment(page)).toBe('expired')
    expect(await kit.row()).toMatchObject({
      plan: 'basic',
      checkout: null,
      paidThrough: new Date('2027-01-01T12:00:00.000Z')
    })
    expect(await kit.actions()).toEqual(['upgrade-started', 'upgrade-abandoned'])
  })

  it('leaves a checkout still open alone: a first one on trial, an upgrade within its period', async () => {
    const trial = setUp()
    await trial.checkout('pro', 0)
    const opened = await trial.row()
    const paying = setUp()
    const row = await subscribed(paying)
    await paying.checkout('pro', row.version)

    await trial.service.execute({ provider: 'fake', eventId: 'evt_1', checkoutId: opened?.checkoutPage?.id as string })
    await paying.notify('payment.fail')

    expect(await trial.row()).toMatchObject({ version: opened?.version, checkout: { plan: 'pro' } })
    expect(await paying.row()).toMatchObject({ status: 'past_due', checkout: { kind: 'upgrade', plan: 'pro' } })
  })

  it('makes a scheduled downgrade the plan at the renewal', async () => {
    const kit = setUp()
    await subscribed(kit, { plan: 'pro', nextPlan: 'basic' })

    await kit.notify('period.renew')

    expect(await kit.row()).toMatchObject({ plan: 'basic', nextPlan: null })
    expect(await kit.actions()).toEqual(['plan-changed'])
  })

  it('records a renewal paid on time, and an end at the provider', async () => {
    const kit = setUp()
    await subscribed(kit)

    await kit.notify('period.renew')
    await kit.notify('subscription.cancel')

    expect(await kit.row()).toMatchObject({ status: 'cancelled' })
    expect(await kit.actions()).toEqual(['renewed', 'cancelled'])
  })

  it('records nothing for a notice that changed nothing', async () => {
    const kit = setUp()
    const row = await subscribed(kit)

    await kit.service.execute({
      provider: 'fake',
      eventId: 'evt_again',
      subscriptionId: row.providerSubscriptionId as string
    })

    expect(await kit.entries()).toEqual([])
  })

  it('ends the subscription a new checkout replaces, once the new one is active', async () => {
    const kit = setUp()
    const row = await subscribed(kit, { status: 'past_due' })
    await kit.provider.cancel(row.providerSubscriptionId as string, { atPeriodEnd: true })
    await kit.checkout('basic', row.version)

    const notice = await kit.notify('checkout.complete')

    expect(await kit.provider.subscription(row.providerSubscriptionId as string)).toMatchObject({ status: 'cancelled' })
    expect(await kit.row()).toMatchObject({ status: 'active', providerSubscriptionId: notice.subscriptionId })
  })

  it('ends a live subscription of ours that the row does not hold, and says so at error', async () => {
    const kit = setUp()
    const row = await subscribed(kit)
    const duplicate = await kit.provider.startCheckout({
      organizationId: 'org-1',
      plan: 'pro',
      method: 'card',
      customerId: row.customerId,
      returnUrl: 'http://localhost:5173/back',
      cancelUrl: 'http://localhost:5173/left'
    })
    void duplicate
    const notice = (await kit.command('checkout.complete')) as BillingNotice

    await kit.service.execute({ provider: 'fake', ...notice })

    expect(await kit.provider.subscription(notice.subscriptionId as string)).toMatchObject({ status: 'cancelled' })
    expect(await kit.row()).toMatchObject({ providerSubscriptionId: row.providerSubscriptionId })
    expect(kit.lines).toContainEqual(expect.objectContaining({ level: 50, msg: 'billing duplicate subscription' }))
  })

  it('ignores a notice about a customer no row holds, or from another provider', async () => {
    const kit = setUp()

    await kit.service.execute({ provider: 'fake', eventId: 'evt_1', customerId: 'cus_unknown' })
    await kit.service.execute({ provider: 'asaas', eventId: 'evt_2', customerId: 'cus_unknown' })

    expect(kit.lines).toEqual([
      expect.objectContaining({ msg: 'billing event ignored', reason: 'unknown customer' }),
      expect.objectContaining({ msg: 'billing event ignored', reason: 'another provider' })
    ])
  })

  it('refuses a provider state whose reference names another organization (T50)', async () => {
    const kit = setUp()
    const row = await subscribed(kit)
    vi.spyOn(kit.provider, 'subscription').mockResolvedValue({
      subscriptionId: row.providerSubscriptionId as string,
      customerId: row.customerId as string,
      reference: 'org-2',
      status: 'cancelled',
      periodStart: null,
      paidThrough: null,
      overdueSince: null,
      cancelAtPeriodEnd: false,
      price: plans.basic.price
    })

    await kit.service.execute({
      provider: 'fake',
      eventId: 'evt_1',
      subscriptionId: row.providerSubscriptionId as string
    })

    expect(await kit.row()).toMatchObject({ status: 'active' })
    expect(kit.lines).toContainEqual(
      expect.objectContaining({ level: 50, msg: 'billing reference names another organization' })
    )
  })

  it('refuses a notice whose ids name two organizations, at error', async () => {
    const kit = setUp()
    const first = await subscribed(kit, {}, 'org-1')
    const second = await subscribed(kit, {}, 'org-2')

    await kit.service.execute({
      provider: 'fake',
      eventId: 'evt_1',
      subscriptionId: first.providerSubscriptionId as string,
      customerId: second.customerId as string
    })

    expect(kit.lines).toContainEqual(
      expect.objectContaining({ level: 50, msg: 'billing event names two organizations' })
    )
  })

  it("ignores a notice for a row the directory found but the organization's work cannot see", async () => {
    const kit = setUp()
    vi.spyOn(kit.subscriptions, 'organizationsFor').mockResolvedValueOnce(['org-gone'])

    await kit.service.execute({ provider: 'fake', eventId: 'evt_1', customerId: 'cus_1' })

    expect(kit.lines).toContainEqual(
      expect.objectContaining({ msg: 'billing event ignored', reason: 'organization gone' })
    )
  })

  it('throws when another save came first, so the retry reads again', async () => {
    const kit = setUp()
    await kit.checkout('pro', 0)
    const notice = (await kit.command('checkout.complete')) as BillingNotice
    const saved = (await kit.row()) as NonNullable<Awaited<ReturnType<typeof kit.row>>>
    vi.spyOn(kit.provider, 'payment').mockImplementationOnce(async () => {
      await kit.subscriptions.save(saved)
      return 'paid'
    })

    await expect(kit.service.execute({ provider: 'fake', ...notice })).rejects.toThrow(SubscriptionChangedException)
  })

  it('waits for the first charge of a new subscription: a pending one activates nothing', async () => {
    const kit = setUp()
    await kit.checkout('pro', 0)
    const notice = (await kit.command('checkout.complete')) as BillingNotice
    const state = await kit.provider.subscription(notice.subscriptionId as string)
    vi.spyOn(kit.provider, 'subscription').mockResolvedValue({
      ...(state as NonNullable<typeof state>),
      status: 'pending'
    })

    await kit.service.execute({ provider: 'fake', ...notice })

    expect(await kit.row()).toMatchObject({ status: 'trialing', checkout: { plan: 'pro' } })
  })

  it('leaves a claim with no page alone', async () => {
    const kit = setUp()
    const row = await subscribed(kit)
    await kit.subscriptions.save({
      ...row,
      checkout: { kind: 'upgrade', plan: 'pro', amount: { amount: 2000, currency: 'BRL' } }
    })

    await kit.notify('payment.fail')

    expect(await kit.row()).toMatchObject({ status: 'past_due', checkout: { plan: 'pro' } })
    void onTrial
  })
})
