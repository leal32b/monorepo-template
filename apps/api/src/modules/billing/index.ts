/**
 * The billing module's API for other modules and the composition root (ADR 0063). Modules read
 * entitlements through `entitlement` from `@repo/contracts`; a limited use case asks `assertWithinLimit`
 * before it writes.
 */
export { registerBillingRoutes } from './billing.routes'
export { registerBillingJobs, syncPayloadOf, syncSubscription } from './jobs/billing-jobs'
export { assertWithinLimit } from './plan-limits'
