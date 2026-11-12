import type { AuditTrail } from '#libs/ports/audit-trail.port'
import type { UnitOfWork } from '#libs/ports/unit-of-work.port'

/**
 * The trail's read for one organization (ADR 0055, ADR 0061): inside `run`, Postgres shows that
 * organization's entries alone, and lets nothing change them.
 */
export type AuditUnitOfWork = UnitOfWork<{ audit: AuditTrail }>
