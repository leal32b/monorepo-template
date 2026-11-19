/**
 * The identity module's API for every module's routes (AGENTS.md: Auth), used or not yet. A module
 * reaches the tenant guard through `tenantRoutes`, never `requireMember` itself (ADR 0065).
 */
export type {
  /** @public */
  Actor,
  /** @public */
  CurrentSession
} from './current-session.port'
export type {
  /** @public */
  Member,
  Membership
} from './membership.port'
export type { OrganizationDeletionListener } from './organization-deletion.port'
export type { OrganizationOwners } from './organization-owners.port'
export type {
  /** @public */
  PublicOrganization,
  /** @public */
  PublicOrganizations
} from './public-organizations.port'
export {
  /** @public */
  type PublicHandler,
  type PublicSurface,
  publicLimits,
  publicRoute
} from './public-route'
/** @public */
export { requireActor } from './require-actor'
export { type TenantGuard, tenantRoutes } from './tenant-route'
