import { type Limit, subscriptionProblems } from '@repo/contracts'
import { EntitlementException } from '#libs/exceptions/exception.base'

/** One more would pass a limit of the organization's plan (ADR 0063). */
class PlanLimitReachedException extends EntitlementException {
  readonly code = subscriptionProblems.limitReached

  constructor(
    readonly entitlement: Limit,
    readonly limit: number
  ) {
    super(`The organization's plan allows ${limit} of these.`)
  }
}

/**
 * Whether one more fits under a limit of the plan (ADR 0063), given how many the organization holds:
 * a use case counts inside its own transaction and asks this before it writes. At the limit, or past
 * it after a downgrade, one more is refused with `403 plan_limit_reached`; nothing held is touched. A
 * use case on a plan with no limit (`null`) counts nothing and does not ask.
 */
export function assertWithinLimit(key: Limit, limit: number, count: number): void {
  if (count >= limit) throw new PlanLimitReachedException(key, limit)
}
