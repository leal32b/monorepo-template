/**
 * The billing module's API for other modules (ADR 0063). Modules read entitlements through
 * `entitlement` from `@repo/contracts`; a limited use case asks `assertWithinLimit` before it writes.
 */
export { assertWithinLimit } from './plan-limits'
