import { type ApiClient, createQuery } from '#shared/api'
import { getOrganization, listOrganizations, listUsers } from './back-office-api'

/** The back office's reads as router queries (ADR 0038): a page or an organization seen before draws at once. */
export const backOfficeOrganizationsQuery = (api: ApiClient) =>
  createQuery((search: string, page: number) => listOrganizations(api, { search, page }), 'backOffice.organizations')

export const backOfficeOrganizationQuery = (api: ApiClient) =>
  createQuery((organizationId: string) => getOrganization(api, organizationId), 'backOffice.organization')

export const backOfficeUsersQuery = (api: ApiClient) =>
  createQuery((search: string, page: number) => listUsers(api, { search, page }), 'backOffice.users')
