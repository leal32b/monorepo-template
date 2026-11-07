import type { AuthFailure } from '#shared/api'

/** Why a change to a customer was refused, in the words a screen has for it. */
export type CustomerFailureKind = 'emailTaken' | 'gone' | 'changed' | 'notAllowed'

/**
 * The API's codes (ADR 0044): another customer has the email, the customer is gone, someone archived,
 * restored or deleted it first (so the state the user saw is not the one it is in), and a role that does
 * not allow it, or an organization the caller is no longer in.
 */
const kinds: Record<string, CustomerFailureKind> = {
  customer_email_taken: 'emailTaken',
  customer_not_found: 'gone',
  customer_already_archived: 'changed',
  customer_not_archived: 'changed',
  permission_denied: 'notAllowed',
  organization_not_found: 'notAllowed'
}

export function customerFailureKind(failure: AuthFailure): CustomerFailureKind | undefined {
  return failure.code === undefined ? undefined : kinds[failure.code]
}
