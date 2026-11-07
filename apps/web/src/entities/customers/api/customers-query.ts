import { type ApiClient, createQuery } from '#shared/api'
import { type CustomerListRequest, listCustomers } from './customers-api'

/**
 * The customers of an organization, as a router query keyed by the organization and the page asked for
 * (ADR 0038): a page read before is drawn at once and read again behind it.
 */
export const customersQuery = (api: ApiClient) =>
  createQuery(
    (organizationId: string, status: CustomerListRequest['status'], search: string, page: number) =>
      listCustomers(api, organizationId, { status, search, page }),
    'customers'
  )
