import type { AuthFailure } from '#shared/api'

/** Why a billing route refused, in the words the plan page has for it (`billing.errors`). */
export type BillingFailureKind =
  | 'changed'
  | 'checkoutOpen'
  | 'checkoutPaid'
  | 'notActive'
  | 'cancellationScheduled'
  | 'paymentOverdue'
  | 'wrongDirection'
  | 'unavailable'
  | 'notAllowed'

/**
 * The billing routes' codes (ADR 0067): the seven 409s of a subscription that is not as the page read it,
 * the provider out of reach (503, nothing changed), and a caller who is not the owner, or no longer a member.
 */
const kinds: Record<string, BillingFailureKind> = {
  subscription_changed: 'changed',
  checkout_open: 'checkoutOpen',
  checkout_paid: 'checkoutPaid',
  subscription_not_active: 'notActive',
  cancellation_scheduled: 'cancellationScheduled',
  payment_overdue: 'paymentOverdue',
  plan_change_not_allowed: 'wrongDirection',
  service_unavailable: 'unavailable',
  permission_denied: 'notAllowed',
  organization_not_found: 'notAllowed'
}

export function billingFailureKind(failure: AuthFailure): BillingFailureKind | undefined {
  return failure.code === undefined ? undefined : kinds[failure.code]
}

/** Whether the refusal says the subscription is not as the page read it: every 409, after which the page reads it again. */
export function isStale(failure: AuthFailure): boolean {
  return failure.status === 409
}
