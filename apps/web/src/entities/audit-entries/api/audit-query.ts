import { type AuditEntryPage, auditEntryPageSchema } from '@repo/contracts'
import { type ApiClient, createQuery } from '#shared/api'

/**
 * A page of the organization's audit trail, newest first (ADR 0061), as a router query keyed by the
 * organization and where the page starts: `''` for the newest, else the `next` of the page before it.
 * 403 without `audit:read`.
 */
export const auditEntriesQuery = (api: ApiClient) =>
  createQuery((organizationId: string, before: string): Promise<AuditEntryPage> => {
    const query = before === '' ? '' : `?${new URLSearchParams({ before })}`
    return api.get(
      `/api/organizations/${encodeURIComponent(organizationId)}/audit-entries${query}`,
      auditEntryPageSchema
    )
  }, 'audit-entries')
