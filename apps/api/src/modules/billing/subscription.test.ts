import { plans } from '@repo/contracts'
import type { ProviderSubscription } from '#libs/ports/billing-provider.port'
import {
  CancellationScheduledException,
  CheckoutOpenException,
  PaymentOverdueException,
  PlanChangeNotAllowedException,
  SubscriptionNotActiveException
} from './billing.errors'
import {
  activate,
  applyProviderState,
  CLAIM_EXPIRES_MS,
  canCancel,
  canResume,
  changedFields,
  changePlanNow,
  claimCheckout,
  clearCheckout,
  decideCheckout,
  decidePlan,
  onTrial,
  openCheckoutOf,
  type Subscription,
  scheduleNextPlan,
  storeCheckout,
  syncAction
} from './subscription'

const at = (iso: string) => new Date(iso)
const now = at('2026-11-19T12:00:00Z')
const minimum = { amount: 500, currency: 'BRL' } as const

/** Basic, paid from 1 November to 1 December: 12 of 30 days left on the 19th. */
const active: Subscription = {
  ...onTrial('org-1', at('2026-10-15T12:00:00Z'), at('2026-10-01T12:00:00Z')),
  status: 'active',
  plan: 'basic',
  periodStartsAt: at('2026-11-01T12:00:00Z'),
  paidThrough: at('2026-12-01T12:00:00Z'),
  provider: 'fake',
  customerId: 'cus_1',
  providerSubscriptionId: 'sub_1',
  version: 3
}

const provider = (overrides: Partial<ProviderSubscription> = {}): ProviderSubscription => ({
  subscriptionId: 'sub_1',
  customerId: 'cus_1',
  reference: 'org-1',
  status: 'active',
  periodStart: at('2026-11-01T12:00:00Z'),
  paidThrough: at('2026-12-01T12:00:00Z'),
  overdueSince: null,
  cancelAtPeriodEnd: false,
  price: plans.basic.price,
  ...overrides
})

const upgrade = { kind: 'upgrade', plan: 'pro', amount: { amount: 2000, currency: 'BRL' } } as const
const page = { id: 'chk_1', url: 'https://pay.example/chk_1', expiresAt: at('2026-11-19T12:30:00Z') }

describe('onTrial', () => {
  it('is an organization with no row: on trial, at version 0, so the first save inserts it', () => {
    expect(onTrial('org-1', at('2026-11-15T00:00:00Z'), now)).toMatchObject({
      organizationId: 'org-1',
      status: 'trialing',
      plan: null,
      trialEndsAt: at('2026-11-15T00:00:00Z'),
      checkout: null,
      providerSubscriptionId: null,
      version: 0
    })
  })
})

describe('openCheckoutOf', () => {
  it('is none without a checkout', () => {
    expect(openCheckoutOf(active, now)).toBe('none')
  })

  it('is opening while the provider has not answered, for 10 minutes, then lapsed', () => {
    const claimed = claimCheckout(active, upgrade, now)

    expect(openCheckoutOf(claimed, new Date(now.getTime() + CLAIM_EXPIRES_MS - 1))).toBe('opening')
    expect(openCheckoutOf(claimed, new Date(now.getTime() + CLAIM_EXPIRES_MS))).toBe('lapsed')
  })

  it('is payable until its page expires, then lapsed', () => {
    const stored = storeCheckout(
      claimCheckout(active, upgrade, now),
      { page, provider: 'fake', customerId: 'cus_1' },
      now
    )

    expect(openCheckoutOf(stored, at('2026-11-19T12:29:59Z'))).toBe('payable')
    expect(openCheckoutOf(stored, page.expiresAt)).toBe('lapsed')
  })
})

describe('decideCheckout (ADR 0063)', () => {
  it.each([
    ['on trial', onTrial('org-1', now, now)],
    ['after an end', { ...active, status: 'cancelled' as const }],
    ['while past due, a new subscription replacing the overdue one', { ...active, status: 'past_due' as const }]
  ])('subscribes at the full price %s', (_, subscription) => {
    expect(decideCheckout(subscription, 'pro', now, minimum)).toEqual({ kind: 'subscription', amount: plans.pro.price })
  })

  it('subscribes again to the current plan, to change how to pay', () => {
    expect(decideCheckout(active, 'basic', now, minimum)).toEqual({ kind: 'subscription', amount: plans.basic.price })
  })

  it('charges an upgrade the difference for the days left: 12 of 30 days, R$ 20.00', () => {
    expect(decideCheckout(active, 'pro', now, minimum)).toEqual({
      kind: 'upgrade',
      amount: { amount: 2000, currency: 'BRL' }
    })
  })

  it("makes an upgrade free below the provider's minimum charge: R$ 3.33 for the last 2 days", () => {
    expect(decideCheckout(active, 'pro', at('2026-11-29T12:00:00Z'), minimum)).toEqual({ kind: 'free-upgrade' })
  })

  it('refuses a cheaper plan, which waits for the end of the period', () => {
    expect(() => decideCheckout({ ...active, plan: 'pro' }, 'basic', now, minimum)).toThrow(
      PlanChangeNotAllowedException
    )
  })

  it('refuses an upgrade while the plan is set to end', () => {
    expect(() => decideCheckout({ ...active, cancelAtPeriodEnd: true }, 'pro', now, minimum)).toThrow(
      CancellationScheduledException
    )
  })
})

describe('the checkout', () => {
  it('is claimed, then stored with the page and the customer, then cleared', () => {
    const claimed = claimCheckout(active, upgrade, now)
    const stored = storeCheckout(claimed, { page, provider: 'fake', customerId: 'cus_2' }, now)

    expect(claimed).toMatchObject({ checkout: upgrade, checkoutPage: null, updatedAt: now })
    expect(stored).toMatchObject({ checkout: upgrade, checkoutPage: page, provider: 'fake', customerId: 'cus_2' })
    expect(clearCheckout(stored, now)).toMatchObject({ checkout: null, checkoutPage: null })
  })
})

describe('changePlanNow', () => {
  it('sets the plan and clears a scheduled downgrade', () => {
    expect(changePlanNow({ ...active, plan: 'pro', nextPlan: 'basic' }, 'pro', now)).toMatchObject({
      plan: 'pro',
      nextPlan: null
    })
  })
})

describe('decidePlan (ADR 0063)', () => {
  const pro = { ...active, plan: 'pro' as const }

  it('schedules a cheaper plan, once', () => {
    expect(decidePlan(pro, 'basic', now)).toBe('downgrade')
    expect(decidePlan(scheduleNextPlan(pro, 'basic', now), 'basic', now)).toBe('unchanged')
  })

  it('withdraws a scheduled downgrade when the current plan is chosen again, and otherwise changes nothing', () => {
    expect(decidePlan(scheduleNextPlan(pro, 'basic', now), 'pro', now)).toBe('withdraw')
    expect(decidePlan(pro, 'pro', now)).toBe('unchanged')
  })

  it('refuses a dearer plan, which is paid for through the checkout', () => {
    expect(() => decidePlan(active, 'pro', now)).toThrow(PlanChangeNotAllowedException)
  })

  it.each([
    ['on trial', onTrial('org-1', now, now), SubscriptionNotActiveException],
    ['after an end', { ...pro, status: 'cancelled' as const }, SubscriptionNotActiveException],
    ['while past due', { ...pro, status: 'past_due' as const }, PaymentOverdueException],
    ['while the plan is set to end', { ...pro, cancelAtPeriodEnd: true }, CancellationScheduledException],
    ["while an upgrade's payment is open", claimCheckout(active, upgrade, now), CheckoutOpenException]
  ])('refuses %s', (_, subscription, refusal) => {
    expect(() => decidePlan(subscription, 'basic', now)).toThrow(refusal)
  })

  it('lets a downgrade through once an open checkout lapsed', () => {
    const lapsed = storeCheckout(claimCheckout(pro, upgrade, now), { page, provider: 'fake', customerId: 'cus_1' }, now)

    expect(decidePlan(lapsed, 'basic', page.expiresAt)).toBe('downgrade')
  })
})

describe('canCancel and canResume', () => {
  it('schedules an end for a plan paid for or late, once', () => {
    expect(canCancel(active)).toBe(true)
    expect(canCancel({ ...active, status: 'past_due' })).toBe(true)
    expect(canCancel({ ...active, cancelAtPeriodEnd: true })).toBe(false)
    expect(() => canCancel(onTrial('org-1', now, now))).toThrow(SubscriptionNotActiveException)
  })

  it('withdraws a scheduled end while the plan is paid for', () => {
    expect(canResume({ ...active, cancelAtPeriodEnd: true })).toBe(true)
    expect(canResume(active)).toBe(false)
    expect(() => canResume({ ...active, status: 'cancelled' })).toThrow(SubscriptionNotActiveException)
  })
})

describe('applyProviderState (ADR 0063)', () => {
  it("writes the provider's status, period, overdue date and scheduled end", () => {
    const state = provider({ status: 'past_due', overdueSince: at('2026-12-01T12:00:00Z'), cancelAtPeriodEnd: true })

    expect(applyProviderState(active, state, now)).toMatchObject({
      status: 'past_due',
      pastDueSince: at('2026-12-01T12:00:00Z'),
      cancelAtPeriodEnd: true,
      updatedAt: now
    })
  })

  it('keeps no overdue date once nothing is overdue', () => {
    const late = { ...active, status: 'past_due' as const, pastDueSince: at('2026-12-01T12:00:00Z') }

    expect(
      applyProviderState(late, provider({ overdueSince: at('2026-12-01T12:00:00Z') }), now).pastDueSince
    ).toBeNull()
  })

  it('changes nothing for a subscription whose first charge is not paid', () => {
    expect(applyProviderState(active, provider({ status: 'pending' }), now)).toBe(active)
  })

  it('makes a scheduled downgrade the plan once a new period starts, and not before', () => {
    const scheduled = { ...active, plan: 'pro' as const, nextPlan: 'basic' as const }
    const renewed = provider({ periodStart: at('2026-12-01T12:00:00Z'), paidThrough: at('2027-01-01T12:00:00Z') })

    expect(applyProviderState(scheduled, provider(), now)).toMatchObject({ plan: 'pro', nextPlan: 'basic' })
    expect(applyProviderState(scheduled, renewed, now)).toMatchObject({ plan: 'basic', nextPlan: null })
  })

  it('clears a scheduled downgrade when the subscription ends', () => {
    const scheduled = { ...active, plan: 'pro' as const, nextPlan: 'basic' as const }

    expect(applyProviderState(scheduled, provider({ status: 'cancelled' }), now)).toMatchObject({
      status: 'cancelled',
      plan: 'pro',
      nextPlan: null
    })
  })

  it('reads a row with no period yet as not renewed', () => {
    const fresh = { ...onTrial('org-1', now, now), nextPlan: 'basic' as const }

    expect(applyProviderState(fresh, provider(), now).nextPlan).toBe('basic')
  })
})

describe('activate', () => {
  it("adopts the provider's subscription with the plan its checkout was for", () => {
    const opened = claimCheckout(
      onTrial('org-1', now, now),
      { kind: 'subscription', plan: 'pro', amount: plans.pro.price },
      now
    )

    expect(activate(opened, provider({ subscriptionId: 'sub_9', customerId: 'cus_9' }), now)).toMatchObject({
      status: 'active',
      plan: 'pro',
      nextPlan: null,
      providerSubscriptionId: 'sub_9',
      customerId: 'cus_9',
      paidThrough: at('2026-12-01T12:00:00Z'),
      checkout: null,
      checkoutPage: null
    })
  })
})

describe('changedFields', () => {
  it('names the fields that differ, dates by their instant, the page as the checkout', () => {
    const later = { ...active, paidThrough: new Date(active.paidThrough as Date), status: 'past_due' as const }
    const stored = storeCheckout(
      claimCheckout(active, upgrade, now),
      { page, provider: 'fake', customerId: 'cus_1' },
      now
    )

    expect(changedFields(active, later)).toEqual(['status'])
    expect(changedFields(claimCheckout(active, upgrade, now), stored)).toEqual(['checkout'])
    expect(changedFields(active, { ...active, version: 9, updatedAt: now })).toEqual([])
  })
})

describe('syncAction (ADR 0063)', () => {
  const after = (overrides: Partial<Subscription>) => ({ ...active, ...overrides })

  it('records nothing when nothing changed', () => {
    expect(syncAction(active, { ...active, updatedAt: now }, 'activated')).toBeNull()
  })

  it('names what the job did, when it completed or dropped a checkout', () => {
    expect(syncAction(active, after({ plan: 'pro' }), 'plan-changed')).toBe('plan-changed')
  })

  it.each([
    ['cancelled', after({ status: 'cancelled' })],
    ['payment-failed', after({ status: 'past_due' })],
    ['plan-changed', after({ plan: 'pro' })],
    ['cancellation-scheduled', after({ cancelAtPeriodEnd: true })],
    ['renewed', after({ paidThrough: at('2027-01-01T12:00:00Z') })]
  ])('names %s from the state', (action, changed) => {
    expect(syncAction(active, changed)).toBe(action)
  })

  it('names a recovery, a withdrawn end, and a late payment whose date moved', () => {
    const late = after({ status: 'past_due', pastDueSince: at('2026-12-01T12:00:00Z') })

    expect(syncAction(late, after({}))).toBe('payment-recovered')
    expect(syncAction(after({ cancelAtPeriodEnd: true }), active)).toBe('cancellation-withdrawn')
    expect(syncAction(late, { ...late, pastDueSince: at('2027-01-01T12:00:00Z') })).toBe('payment-failed')
  })
})
