import type { AuditAction } from '@repo/contracts'
import type { AuditActor, AuditEntry } from '#libs/ports/audit-trail.port'

/**
 * The audit entry of a change of an organization's subscription (ADR 0061, ADR 0063): the resource is
 * `subscription` and its id the organization's, the actor the owner for what they asked for and the
 * system for what a provider's notice brought, with the names of the fields it changed. Recorded in
 * the same unit of work as the change.
 */
export function subscriptionEntry(
  organizationId: string,
  change: { id: string; at: Date; actor: AuditActor; action: AuditAction<'subscription'>; fields: readonly string[] }
): AuditEntry {
  return {
    id: change.id,
    organizationId,
    at: change.at,
    actor: change.actor,
    resourceType: 'subscription',
    resourceId: organizationId,
    action: change.action,
    fields: change.fields
  }
}
