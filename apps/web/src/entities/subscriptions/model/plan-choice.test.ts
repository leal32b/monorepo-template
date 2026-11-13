import type { Subscription } from '@repo/contracts'
import { choiceOf } from './plan-choice'

const now = new Date('2026-11-20T12:00:00.000Z')
const day = 24 * 60 * 60 * 1000
const inDays = (days: number) => new Date(now.getTime() + days * day).toISOString()
const minimumCharge = { amount: 500, currency: 'BRL' as const }

const trial: Subscription = {
  status: 'trialing',
  access: 'full',
  plan: null,
  nextPlan: null,
  trialEndsAt: inDays(10),
  periodStartsAt: null,
  paidThrough: null,
  pastDueSince: null,
  cancelAtPeriodEnd: false,
  checkout: null
}

const basic: Subscription = {
  ...trial,
  status: 'active',
  plan: 'basic',
  trialEndsAt: inDays(-20),
  periodStartsAt: inDays(-18),
  paidThrough: inDays(12)
}

const choose = (subscription: Subscription, plan: 'basic' | 'pro', at = now) =>
  choiceOf(subscription, plan, { now: at, minimumCharge })

describe('choiceOf (ADR 0063, "Changing plan")', () => {
  it('subscribes at the full price on trial, once it ended, and after a plan ended', () => {
    expect(choose(trial, 'pro')).toEqual({ kind: 'subscribe' })
    expect(choose({ ...trial, access: 'read-only' }, 'basic')).toEqual({ kind: 'subscribe' })
    expect(choose({ ...basic, status: 'cancelled', access: 'read-only' }, 'basic')).toEqual({ kind: 'subscribe' })
  })

  it('upgrades for the difference over the days left, from the end of the paid period on', () => {
    expect(choose(basic, 'pro')).toEqual({
      kind: 'upgrade',
      amount: { amount: 2000, currency: 'BRL' },
      days: 12,
      from: new Date(inDays(12))
    })
  })

  it('upgrades for free below the provider’s minimum charge', () => {
    const lastDay = { ...basic, paidThrough: inDays(0.5) }

    expect(choose(lastDay, 'pro')).toEqual({ kind: 'freeUpgrade', days: 1, from: new Date(inDays(0.5)) })
  })

  it('downgrades from the end of the paid period, and says a downgrade already scheduled', () => {
    const pro = { ...basic, plan: 'pro' as const }

    expect(choose(pro, 'basic')).toEqual({ kind: 'downgrade', from: new Date(inDays(12)) })
    expect(choose({ ...pro, nextPlan: 'basic' }, 'basic')).toEqual({ kind: 'scheduled' })
  })

  it('has nothing to choose in the plan already paid for, late or set to end', () => {
    expect(choose(basic, 'basic')).toEqual({ kind: 'current' })
    expect(choose({ ...basic, status: 'past_due', pastDueSince: inDays(-2) }, 'basic')).toEqual({ kind: 'current' })
    expect(choose({ ...basic, cancelAtPeriodEnd: true }, 'basic')).toEqual({ kind: 'current' })
  })

  it('waits while a payment is open: its own plan is the payment, another one waits for it', () => {
    const upgrading: Subscription = {
      ...basic,
      checkout: { kind: 'upgrade', plan: 'pro', amount: { amount: 2000, currency: 'BRL' } }
    }

    expect(choose(upgrading, 'pro')).toEqual({ kind: 'pending' })
    expect(choose(upgrading, 'basic')).toEqual({ kind: 'blocked', reason: 'open' })
  })

  it('asks to pay what is late first, and to keep a plan set to end before changing it', () => {
    expect(choose({ ...basic, status: 'past_due', pastDueSince: inDays(-2) }, 'pro')).toEqual({
      kind: 'blocked',
      reason: 'late'
    })
    expect(choose({ ...basic, cancelAtPeriodEnd: true }, 'pro')).toEqual({ kind: 'blocked', reason: 'ending' })
  })
})
