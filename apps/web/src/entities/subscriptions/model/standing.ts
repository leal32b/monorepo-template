import type { Subscription } from '@repo/contracts'

/**
 * Where the subscription stands, as the plan page's first row says it (ADR 0063): a badge, a line and the
 * dates it names. `days` is a trial's days left.
 */
export type Standing = {
  badge: 'trial' | 'active' | 'late' | 'readOnly'
  line: 'trial' | 'trialEnded' | 'paid' | 'late' | 'ended' | 'endedUndated'
  dates: { date?: Date; due?: Date }
  days?: number
}

const day = 24 * 60 * 60 * 1000

/**
 * The subscription's standing `now`: a trial with its days left or its end, a plan paid until a date, a
 * payment late since its due date, a plan that ended. Read only is the API's `access`.
 */
export function standingOf(subscription: Subscription, now: Date): Standing {
  const readOnly = subscription.access === 'read-only'
  const paidThrough = subscription.paidThrough === null ? null : new Date(subscription.paidThrough)
  const ended = (): Standing =>
    paidThrough !== null && paidThrough <= now
      ? { badge: 'readOnly', line: 'ended', dates: { date: paidThrough } }
      : { badge: 'readOnly', line: 'endedUndated', dates: {} }

  switch (subscription.status) {
    case 'trialing': {
      const date = new Date(subscription.trialEndsAt)
      if (readOnly) return { badge: 'readOnly', line: 'trialEnded', dates: { date } }
      return { badge: 'trial', line: 'trial', dates: { date }, days: Math.ceil((date.getTime() - now.getTime()) / day) }
    }
    case 'active':
      return readOnly ? ended() : { badge: 'active', line: 'paid', dates: { date: paidThrough as Date } }
    case 'past_due': {
      const badge = readOnly ? 'readOnly' : 'late'
      if (subscription.pastDueSince === null) return { badge, line: 'paid', dates: { date: paidThrough as Date } }
      return { badge, line: 'late', dates: { due: new Date(subscription.pastDueSince) } }
    }
    case 'cancelled':
      return ended()
  }
}
