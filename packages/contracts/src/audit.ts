/**
 * The audit trail of an organization (ADR 0061). Each resource lists the actions its module records,
 * as stable codes: the API stores them, the web says each pair in its languages. A module adds its
 * resource here, with the actions it records.
 */
export const auditActions = {
  customer: ['created', 'updated', 'archived', 'restored', 'deleted']
} as const

export type AuditResourceType = keyof typeof auditActions

export type AuditAction<R extends AuditResourceType = AuditResourceType> = (typeof auditActions)[R][number]
