import type { Billing, Subscription } from '@repo/contracts'
import { createRoot, createSignal } from 'solid-js'
import { createArrival } from './arrival'

const subscription: Subscription = {
  status: 'active',
  access: 'full',
  plan: 'basic',
  nextPlan: null,
  trialEndsAt: '2026-10-01T00:00:00.000Z',
  periodStartsAt: '2026-11-10T00:00:00.000Z',
  paidThrough: '2026-12-10T00:00:00.000Z',
  pastDueSince: null,
  cancelAtPeriodEnd: false,
  checkout: null
}
const billingOf = (over: Partial<Subscription>): Billing => ({
  subscription: { ...subscription, ...over },
  version: 1,
  reference: null,
  checkoutUrl: null,
  checkoutExpiresAt: null,
  minimumCharge: { amount: 500, currency: 'BRL' }
})
const upgrade = { kind: 'upgrade' as const, plan: 'pro' as const, amount: { amount: 2000, currency: 'BRL' as const } }

/** The way back over a read the test sets, as the page's read would answer. */
function arriving(came: 'returned' | 'cancelled' | undefined) {
  return createRoot((dispose) => {
    const [billing, setBilling] = createSignal<Billing | undefined>()
    const readAgain = vi.fn()
    const confirmed = vi.fn()
    const { arrival, forget } = createArrival(came, billing, { readAgain, confirmed })
    return { arrival, forget, setBilling, readAgain, confirmed, dispose }
  })
}

describe('createArrival (ADR 0063, "Coming back from the provider")', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('waits for the read before it says anything', () => {
    const way = arriving('returned')

    expect(way.arrival()).toBeUndefined()
    way.setBilling(billingOf({ checkout: upgrade }))
    expect(way.arrival()).toMatchObject({ kind: 'waiting' })
    way.dispose()
  })

  it('keeps waiting while the payment is still open, and says nothing more once it said the outcome', () => {
    const way = arriving('returned')
    way.setBilling(billingOf({ checkout: upgrade }))
    vi.advanceTimersByTime(3000)
    way.setBilling(billingOf({ checkout: upgrade }))

    expect(way.readAgain).toHaveBeenCalledOnce()
    expect(way.arrival()).toMatchObject({ kind: 'waiting' })
    way.setBilling(billingOf({ plan: 'pro' }))
    expect(way.arrival()).toEqual({ kind: 'confirmed', plan: 'pro' })
    way.setBilling(billingOf({ plan: 'basic' }))
    expect(way.arrival()).toEqual({ kind: 'confirmed', plan: 'pro' })
    expect(way.confirmed).toHaveBeenCalledOnce()
    way.dispose()
  })

  it('says nothing of a return with nothing open and no plan, even when the plan changes later', () => {
    const way = arriving('returned')
    way.setBilling(billingOf({ plan: null, status: 'trialing' }))
    way.setBilling(billingOf({ plan: 'basic' }))

    expect(way.arrival()).toBeUndefined()
    way.dispose()
  })

  it('says a page left at the provider, and nothing at all without a way back', () => {
    expect(arriving('cancelled').arrival()).toEqual({ kind: 'cancelled' })
    expect(arriving(undefined).arrival()).toBeUndefined()
  })

  it('stops waiting, and says nothing more, once the owner does something else', () => {
    const way = arriving('returned')
    way.setBilling(billingOf({ checkout: upgrade }))
    way.forget()
    vi.advanceTimersByTime(60_000)

    expect(way.arrival()).toBeUndefined()
    expect(way.readAgain).not.toHaveBeenCalled()
    way.dispose()
  })
})
