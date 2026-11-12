import type { HttpRouter } from '#libs/http/router'
import type { CurrentSession, Membership } from '#modules/identity/index'
import type { AuditUnitOfWork } from './audit-unit-of-work.port'
import { ListAuditEntriesController } from './queries/list-audit-entries/list-audit-entries.http-controller'
import { ListAuditEntriesService } from './queries/list-audit-entries/list-audit-entries.service'

export type AuditRoutesDeps = {
  session: CurrentSession
  /** The tenant guard's, and the actors' names (ADR 0061). */
  membership: Membership
  unitOfWork: AuditUnitOfWork
}

/**
 * The trail's one route, read only (ADR 0061): every module writes entries through its own unit of
 * work; this module only reads them, behind the tenant guard and `audit:read`.
 */
export function registerAuditRoutes(router: HttpRouter, { session, membership, unitOfWork }: AuditRoutesDeps): void {
  router.get(
    '/api/organizations/:organizationId/audit-entries',
    new ListAuditEntriesController(session, membership, new ListAuditEntriesService(unitOfWork, membership)).handle
  )
}
