import type { AuditAction } from '@repo/contracts'
import type { AuditActor, AuditEntry } from '#libs/ports/audit-trail.port'
import type { Customer } from './domain/customer'

/**
 * The audit entry of a change to a customer (ADR 0061): the module's code for the resource, the
 * customer's id and the names of the fields the change set, never their values. Recorded in the same
 * unit of work as the change, so it exists if and only if the change does.
 */
export function customerEntry(
  customer: Customer,
  change: {
    id: string
    at: Date
    actor: AuditActor
    action: AuditAction<'customer'>
    fields?: readonly string[] | undefined
  }
): AuditEntry {
  return {
    id: change.id,
    organizationId: customer.organizationId,
    at: change.at,
    actor: change.actor,
    resourceType: 'customer',
    resourceId: customer.id,
    action: change.action,
    fields: change.fields ?? []
  }
}
