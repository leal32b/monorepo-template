import { type OrganizationExport, organizationExportSchema } from '@repo/contracts'
import type { ApiClient } from '#shared/api'

/** The owner's export routes (ADR 0074): `organization:export`, open while the organization is read only. */
const base = (organizationId: string) => `/api/organizations/${encodeURIComponent(organizationId)}/export`

/** The organization's last export: none, pending, ready or expired, and when the owner may ask again. */
export function getExport(api: ApiClient, organizationId: string): Promise<OrganizationExport> {
  return api.get(base(organizationId), organizationExportSchema)
}

/** Asks for a new export, which replaces the last one: the answer is it, pending. */
export function requestExport(api: ApiClient, organizationId: string): Promise<OrganizationExport> {
  return api.send('POST', base(organizationId), undefined, organizationExportSchema)
}

/** The ready export's zip, which the browser downloads itself with the session's cookie. */
export function exportFileUrl(api: ApiClient, organizationId: string): string {
  return api.url(`${base(organizationId)}/file`)
}
