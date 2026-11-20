import {
  type BackOfficeOrganizationDetail,
  type BackOfficeOrganizationPage,
  type BackOfficeUserPage,
  backOfficeOrganizationDetailSchema,
  backOfficeOrganizationPageSchema,
  backOfficeUserPageSchema
} from '@repo/contracts'
import type { ApiClient } from '#shared/api'

/** What a back office list is asked for: the words searched (none is `''`) and the page. */
export type BackOfficeListRequest = { search: string; page: number }

const queryOf = ({ search, page }: BackOfficeListRequest) => {
  const query = new URLSearchParams({ page: String(page) })
  if (search !== '') query.set('search', search)
  return query
}

/**
 * Every organization, a page at a time (ADR 0077). Whoever is not an operator gets a 404, as for a path
 * that does not exist.
 */
export function listOrganizations(api: ApiClient, request: BackOfficeListRequest): Promise<BackOfficeOrganizationPage> {
  return api.get(`/api/admin/organizations?${queryOf(request)}`, backOfficeOrganizationPageSchema)
}

export function getOrganization(api: ApiClient, organizationId: string): Promise<BackOfficeOrganizationDetail> {
  return api.get(`/api/admin/organizations/${encodeURIComponent(organizationId)}`, backOfficeOrganizationDetailSchema)
}

export function listUsers(api: ApiClient, request: BackOfficeListRequest): Promise<BackOfficeUserPage> {
  return api.get(`/api/admin/users?${queryOf(request)}`, backOfficeUserPageSchema)
}
