import { listAuditEntriesQuerySchema } from '@repo/contracts'
import { HttpProblem } from '#libs/http/problem'
import type { HttpRouter } from '#libs/http/router'
import type { AuditCursor } from '#libs/ports/audit-trail.port'
import { type TenantGuard, tenantRoutes } from '#modules/identity/index'
import { decodeCursor } from './audit-cursor'
import type { AuditUnitOfWork } from './audit-unit-of-work.port'
import { ListAuditEntriesService } from './queries/list-audit-entries/list-audit-entries.service'

/** The tenant guard's ports; `membership` also names the actors (ADR 0061). */
export type AuditRoutesDeps = TenantGuard & { unitOfWork: AuditUnitOfWork }

/** Where the page starts: the first page without `before`, a 400 for a cursor this API did not write. */
function cursorOf(before: string | undefined): AuditCursor | undefined {
  const cursor = before === undefined ? undefined : decodeCursor(before)
  if (cursor === null) {
    throw new HttpProblem(400, 'validation_failed', {
      detail: 'The query string does not match the expected shape.',
      errors: [{ path: 'before', message: 'Not a page of this trail.' }]
    })
  }
  return cursor
}

/**
 * The trail's one route, read only (ADR 0061): every module writes entries through its own unit of
 * work; this module only reads them, a page at a time, for `audit:read` (ADR 0065).
 */
export function registerAuditRoutes(router: HttpRouter, deps: AuditRoutesDeps): void {
  const list = new ListAuditEntriesService(deps.unitOfWork, deps.membership)
  tenantRoutes(router, deps).get(
    '/api/organizations/:organizationId/audit-entries',
    { permission: { audit: ['read'] }, input: listAuditEntriesQuerySchema },
    ({ organizationId, input }) => list.execute(organizationId, cursorOf(input.before))
  )
}
