import {
  type CurrentImpersonation,
  currentImpersonationSchema,
  type Impersonation,
  impersonationSchema
} from '@repo/contracts'
import { type ApiClient, noContent } from '#shared/api'

/** The operator's visit now, or `null`. */
export function getImpersonation(api: ApiClient): Promise<CurrentImpersonation> {
  return api.get('/api/admin/impersonation', currentImpersonationSchema)
}

/** Enters the organization as its owner sees it, read only; 409 `impersonation_active` while in another. */
export function startImpersonation(api: ApiClient, organizationId: string): Promise<Impersonation> {
  return api.send(
    'POST',
    `/api/admin/organizations/${encodeURIComponent(organizationId)}/impersonation`,
    undefined,
    impersonationSchema
  )
}

/** Leaves the organization the operator is in; nothing happens when they are in none. */
export function leaveImpersonation(api: ApiClient): Promise<void> {
  return api.send('DELETE', '/api/admin/impersonation', undefined, noContent)
}
