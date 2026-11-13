import { gracePeriod, type Subscription } from '@repo/contracts'

/** What a notice says, by the state it is about. */
export type NoticeKey =
  | 'trialEnding'
  | 'trialEnded'
  | 'endScheduled'
  | 'pastDue'
  | 'pastDueReadOnly'
  | 'ended'
  | 'endedUndated'

/** What the owner can do about it, on the plan page: see the plans, pay, or keep the plan. */
export type NoticeAction = 'plans' | 'pay' | 'keep'

/**
 * The subscription's state as the frame says it (ADR 0063): an `Alert` of a kind, its words by the state
 * and by who reads it, the dates they name, and for the owner what to do about it.
 */
export type Notice = {
  variant: 'info' | 'warning'
  key: NoticeKey
  /** The owner, who manages the plan and is offered the way out, or another member, told who can act. */
  audience: 'owner' | 'member'
  /** `date`: when a trial or a plan ends or ended; `due` and `until`: when a late payment was due, and the end of its grace. */
  dates: { date?: Date; due?: Date; until?: Date }
  action?: NoticeAction
}

const day = 24 * 60 * 60 * 1000

/** The owner hears of a trial's end a week ahead; other members, who cannot act on it, three days ahead. */
const aheadDays = { owner: 7, member: 3 } as const

/**
 * What the frame says of the subscription, if anything (ADR 0063's table): a trial ending or ended, a
 * scheduled end, a late payment within its grace period or past it, a plan that ended. Read only comes
 * from `access`, which the API computed with its own clock; the device's clock only decides how far ahead
 * an end is told. A state with nothing to do says nothing, and a plan the owner is changing says it on the
 * plan page alone.
 */
export function noticeOf(
  subscription: Subscription,
  { manages, now }: { manages: boolean; now: Date }
): Notice | undefined {
  const audience = manages ? 'owner' : 'member'
  const readOnly = subscription.access === 'read-only'
  const soon = (date: Date) => date.getTime() - now.getTime() <= aheadDays[audience] * day
  const say = (variant: Notice['variant'], key: NoticeKey, dates: Notice['dates'], action: NoticeAction): Notice => ({
    variant,
    key,
    audience,
    dates,
    ...(manages && { action })
  })
  const paidThrough = subscription.paidThrough === null ? null : new Date(subscription.paidThrough)
  const ended = () =>
    paidThrough !== null && paidThrough <= now
      ? say('warning', 'ended', { date: paidThrough }, 'plans')
      : say('warning', 'endedUndated', {}, 'plans')

  switch (subscription.status) {
    case 'trialing': {
      const date = new Date(subscription.trialEndsAt)
      if (readOnly) return say('warning', 'trialEnded', { date }, 'plans')
      return soon(date) ? say('info', 'trialEnding', { date }, 'plans') : undefined
    }
    case 'active': {
      if (!subscription.cancelAtPeriodEnd) return undefined
      if (readOnly) return ended()
      const date = paidThrough as Date
      // The owner can still keep the plan: told at once. Others hear of it in its last days.
      return manages || soon(date) ? say('info', 'endScheduled', { date }, 'keep') : undefined
    }
    case 'past_due': {
      if (subscription.pastDueSince === null) return undefined
      const due = new Date(subscription.pastDueSince)
      const dates = { due, until: new Date(due.getTime() + gracePeriod.days * day) }
      if (readOnly) return say('warning', 'pastDueReadOnly', dates, 'pay')
      return say(manages ? 'warning' : 'info', 'pastDue', dates, 'pay')
    }
    case 'cancelled':
      return ended()
  }
}
