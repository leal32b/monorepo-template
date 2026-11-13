import type { Subscription } from '@repo/contracts'
import { noticeOf } from './subscription-notice'

const now = new Date('2026-11-20T12:00:00.000Z')
const day = 24 * 60 * 60 * 1000
const inDays = (days: number) => new Date(now.getTime() + days * day).toISOString()

const trial = (over: Partial<Subscription> = {}): Subscription => ({
  status: 'trialing',
  access: 'full',
  plan: null,
  nextPlan: null,
  trialEndsAt: inDays(12),
  periodStartsAt: null,
  paidThrough: null,
  pastDueSince: null,
  cancelAtPeriodEnd: false,
  checkout: null,
  ...over
})

const active = (over: Partial<Subscription> = {}): Subscription =>
  trial({
    status: 'active',
    plan: 'pro',
    trialEndsAt: inDays(-30),
    periodStartsAt: inDays(-10),
    paidThrough: inDays(20),
    ...over
  })

const owner = { manages: true, now }
const member = { manages: false, now }

describe('noticeOf (ADR 0063, "What each screen says, and who sees it")', () => {
  it('says nothing of a trial with more than a week left, nor of a plan paid for', () => {
    expect(noticeOf(trial(), owner)).toBeUndefined()
    expect(noticeOf(active(), owner)).toBeUndefined()
    expect(noticeOf(active({ nextPlan: 'basic' }), owner)).toBeUndefined()
    expect(
      noticeOf(
        active({ checkout: { kind: 'upgrade', plan: 'pro', amount: { amount: 2000, currency: 'BRL' } } }),
        member
      )
    ).toBeUndefined()
  })

  it('tells the owner of a trial’s last week, and other members of its last three days', () => {
    const ending = trial({ trialEndsAt: inDays(5) })

    expect(noticeOf(ending, owner)).toEqual({
      variant: 'info',
      key: 'trialEnding',
      audience: 'owner',
      dates: { date: new Date(inDays(5)) },
      action: 'plans'
    })
    expect(noticeOf(ending, member)).toBeUndefined()
    expect(noticeOf(trial({ trialEndsAt: inDays(3) }), member)).toEqual({
      variant: 'info',
      key: 'trialEnding',
      audience: 'member',
      dates: { date: new Date(inDays(3)) }
    })
  })

  it('warns everyone once a trial ended, and offers the owner the plans', () => {
    const ended = trial({ trialEndsAt: inDays(-2), access: 'read-only' })

    expect(noticeOf(ended, owner)).toMatchObject({ variant: 'warning', key: 'trialEnded', action: 'plans' })
    expect(noticeOf(ended, owner)?.dates).toEqual({ date: new Date(inDays(-2)) })
    expect(noticeOf(ended, member)).toMatchObject({ variant: 'warning', key: 'trialEnded', audience: 'member' })
  })

  it('tells the owner of a scheduled end, with the way to keep the plan, and members of its last three days', () => {
    const ending = active({ cancelAtPeriodEnd: true })

    expect(noticeOf(ending, owner)).toEqual({
      variant: 'info',
      key: 'endScheduled',
      audience: 'owner',
      dates: { date: new Date(inDays(20)) },
      action: 'keep'
    })
    expect(noticeOf(ending, member)).toBeUndefined()
    expect(noticeOf(active({ cancelAtPeriodEnd: true, paidThrough: inDays(2) }), member)).toMatchObject({
      key: 'endScheduled',
      audience: 'member'
    })
  })

  it('warns everyone once a scheduled end passed, before the provider says it ended', () => {
    const over = active({ cancelAtPeriodEnd: true, paidThrough: inDays(-1), access: 'read-only' })

    expect(noticeOf(over, owner)).toMatchObject({ variant: 'warning', key: 'ended', action: 'plans' })
    expect(noticeOf(over, member)?.dates).toEqual({ date: new Date(inDays(-1)) })
  })

  it('warns the owner of a late payment, with when it was due and until when to pay, and tells members', () => {
    const late = active({ status: 'past_due', pastDueSince: inDays(-3) })

    expect(noticeOf(late, owner)).toEqual({
      variant: 'warning',
      key: 'pastDue',
      audience: 'owner',
      dates: { due: new Date(inDays(-3)), until: new Date(inDays(11)) },
      action: 'pay'
    })
    expect(noticeOf(late, member)).toEqual({
      variant: 'info',
      key: 'pastDue',
      audience: 'member',
      dates: { due: new Date(inDays(-3)), until: new Date(inDays(11)) }
    })
  })

  it('warns everyone once the grace period is over', () => {
    const over = active({ status: 'past_due', pastDueSince: inDays(-15), access: 'read-only' })

    expect(noticeOf(over, owner)).toMatchObject({ variant: 'warning', key: 'pastDueReadOnly', action: 'pay' })
    expect(noticeOf(over, member)).toMatchObject({ variant: 'warning', key: 'pastDueReadOnly' })
    expect(noticeOf(over, member)?.dates).toEqual({ due: new Date(inDays(-15)), until: new Date(inDays(-1)) })
  })

  it('says nothing of a late payment whose due date the provider did not give', () => {
    expect(noticeOf(active({ status: 'past_due' }), owner)).toBeUndefined()
  })

  it('warns everyone of an ended plan, dated by the end of its paid period once that is past', () => {
    const ended = active({ status: 'cancelled', paidThrough: inDays(-4), access: 'read-only' })

    expect(noticeOf(ended, owner)).toEqual({
      variant: 'warning',
      key: 'ended',
      audience: 'owner',
      dates: { date: new Date(inDays(-4)) },
      action: 'plans'
    })
    expect(noticeOf(ended, member)).toMatchObject({ key: 'ended', audience: 'member' })
  })

  it('leaves the date out of a plan that ended before its paid period did', () => {
    const cut = active({ status: 'cancelled', access: 'read-only' })

    expect(noticeOf(cut, owner)).toMatchObject({ key: 'endedUndated', dates: {}, action: 'plans' })
    expect(noticeOf(active({ status: 'cancelled', paidThrough: null, access: 'read-only' }), member)).toMatchObject({
      key: 'endedUndated'
    })
  })
})
