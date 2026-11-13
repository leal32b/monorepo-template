import type { Subscription } from '@repo/contracts'
import { standingOf } from './standing'

const now = new Date('2026-11-20T12:00:00.000Z')
const day = 24 * 60 * 60 * 1000
const inDays = (days: number) => new Date(now.getTime() + days * day).toISOString()

const trial: Subscription = {
  status: 'trialing',
  access: 'full',
  plan: null,
  nextPlan: null,
  trialEndsAt: inDays(11.5),
  periodStartsAt: null,
  paidThrough: null,
  pastDueSince: null,
  cancelAtPeriodEnd: false,
  checkout: null
}
const active: Subscription = {
  ...trial,
  status: 'active',
  plan: 'pro',
  trialEndsAt: inDays(-30),
  periodStartsAt: inDays(-10),
  paidThrough: inDays(20)
}

describe('standingOf: the plan page’s first line (ADR 0063)', () => {
  it('counts a trial’s days left, a part of a day as a whole one', () => {
    expect(standingOf(trial, now)).toEqual({
      badge: 'trial',
      line: 'trial',
      dates: { date: new Date(inDays(11.5)) },
      days: 12
    })
  })

  it('dates a trial that ended, read only', () => {
    expect(standingOf({ ...trial, trialEndsAt: inDays(-1), access: 'read-only' }, now)).toEqual({
      badge: 'readOnly',
      line: 'trialEnded',
      dates: { date: new Date(inDays(-1)) }
    })
  })

  it('says until when a plan is paid', () => {
    expect(standingOf(active, now)).toEqual({ badge: 'active', line: 'paid', dates: { date: new Date(inDays(20)) } })
  })

  it('says when a late payment was due, read only once its grace is over', () => {
    const late = { ...active, status: 'past_due' as const, pastDueSince: inDays(-3) }

    expect(standingOf(late, now)).toEqual({ badge: 'late', line: 'late', dates: { due: new Date(inDays(-3)) } })
    expect(standingOf({ ...late, access: 'read-only' }, now).badge).toBe('readOnly')
    expect(standingOf({ ...late, pastDueSince: null }, now)).toMatchObject({ badge: 'late', line: 'paid' })
  })

  it('dates an end once its paid period is past, and leaves the date out before', () => {
    expect(
      standingOf({ ...active, cancelAtPeriodEnd: true, paidThrough: inDays(-1), access: 'read-only' }, now)
    ).toEqual({
      badge: 'readOnly',
      line: 'ended',
      dates: { date: new Date(inDays(-1)) }
    })
    expect(standingOf({ ...active, status: 'cancelled', access: 'read-only' }, now)).toEqual({
      badge: 'readOnly',
      line: 'endedUndated',
      dates: {}
    })
  })
})
