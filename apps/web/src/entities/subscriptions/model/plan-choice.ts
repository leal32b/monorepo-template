import { type Money, type PlanKey, plans, prorateUpgrade, type Subscription } from '@repo/contracts'

/**
 * What choosing a plan means now, so the plan page says it before the owner confirms (ADR 0063):
 * - `subscribe`: a first subscription at the full price (on trial, once it ended, after a plan ended);
 * - `upgrade`: the difference for what is left of the period (`days`), then the new price `from` its end;
 * - `freeUpgrade`: the same below the provider's minimum charge, at no cost;
 * - `downgrade`: the cheaper plan `from` the end of the paid period;
 * - `current`, `scheduled`, `pending`: the plan paid for, the downgrade already scheduled, the payment open;
 * - `blocked`: something comes first: what is late, keeping a plan set to end, the payment open for another.
 */
export type PlanChoice =
  | { kind: 'subscribe' }
  | { kind: 'upgrade'; amount: Money; days: number; from: Date }
  | { kind: 'freeUpgrade'; days: number; from: Date }
  | { kind: 'downgrade'; from: Date }
  | { kind: 'current' | 'scheduled' | 'pending' }
  | { kind: 'blocked'; reason: 'late' | 'ending' | 'open' }

const day = 24 * 60 * 60 * 1000

/**
 * The whole days left of the paid period, a part of a day counted as a whole one, at most the period's
 * length: the days `prorateUpgrade` charges for.
 */
function daysLeft(periodStartsAt: Date, paidThrough: Date, now: Date): number {
  const inPeriod = Math.round((paidThrough.getTime() - periodStartsAt.getTime()) / day)
  return Math.min(Math.ceil((paidThrough.getTime() - now.getTime()) / day), inPeriod)
}

/**
 * The web's reading of the API's rules for a checkout and a change of plan (ADR 0063, ADR 0067), with the
 * device's clock. It only says what to expect: the API decides again, with its own clock, and its amount is
 * the one charged.
 */
export function choiceOf(
  subscription: Subscription,
  plan: PlanKey,
  { now, minimumCharge }: { now: Date; minimumCharge: Money }
): PlanChoice {
  if (subscription.checkout !== null) {
    return subscription.checkout.plan === plan ? { kind: 'pending' } : { kind: 'blocked', reason: 'open' }
  }
  const current = subscription.plan
  const paidFor = subscription.status === 'active' || subscription.status === 'past_due'
  if (paidFor && plan === current) return { kind: 'current' }
  if (subscription.status === 'past_due') return { kind: 'blocked', reason: 'late' }
  if (subscription.status !== 'active' || current === null) return { kind: 'subscribe' }
  if (subscription.cancelAtPeriodEnd) return { kind: 'blocked', reason: 'ending' }
  const periodStartsAt = new Date(subscription.periodStartsAt as string)
  const from = new Date(subscription.paidThrough as string)
  if (plans[plan].price.amount < plans[current].price.amount) {
    return subscription.nextPlan === plan ? { kind: 'scheduled' } : { kind: 'downgrade', from }
  }
  const amount = prorateUpgrade({ from: current, to: plan, periodStartsAt, paidThrough: from, now })
  const days = daysLeft(periodStartsAt, from, now)
  return amount.amount < minimumCharge.amount
    ? { kind: 'freeUpgrade', days, from }
    : { kind: 'upgrade', amount, days, from }
}
