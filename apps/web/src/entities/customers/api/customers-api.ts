import {
  type Customer,
  type CustomerInput,
  type CustomerList,
  type CustomerUpdateInput,
  customerListSchema,
  customerSchema
} from '@repo/contracts'
import { type ApiClient, noContent } from '#shared/api'

/** What the list is asked for: the filter and the page; no search is the empty text. */
export type CustomerListRequest = { status: 'active' | 'archived'; search: string; page: number }

const base = (organizationId: string) => `/api/organizations/${encodeURIComponent(organizationId)}/customers`
const one = (organizationId: string, id: string) => `${base(organizationId)}/${encodeURIComponent(id)}`

/** One page of the organization's customers (ADR 0044). 403 without `customer:read`, 404 outside the organization. */
export function listCustomers(
  api: ApiClient,
  organizationId: string,
  request: CustomerListRequest
): Promise<CustomerList> {
  const query = new URLSearchParams({ status: request.status, page: String(request.page) })
  if (request.search !== '') query.set('search', request.search)
  return api.get(`${base(organizationId)}?${query}`, customerListSchema)
}

export function createCustomer(api: ApiClient, organizationId: string, input: CustomerInput): Promise<Customer> {
  return api.send('POST', base(organizationId), input, customerSchema)
}

/** The whole customer again: a field left out is cleared. */
export function updateCustomer(
  api: ApiClient,
  organizationId: string,
  id: string,
  input: CustomerUpdateInput
): Promise<Customer> {
  return api.send('PUT', one(organizationId, id), input, customerSchema)
}

export function archiveCustomer(api: ApiClient, organizationId: string, id: string): Promise<Customer> {
  return api.send('POST', `${one(organizationId, id)}/archive`, undefined, customerSchema)
}

export function restoreCustomer(api: ApiClient, organizationId: string, id: string): Promise<Customer> {
  return api.send('POST', `${one(organizationId, id)}/restore`, undefined, customerSchema)
}

/** Only an archived customer can be deleted: the API answers 409 `customer_not_archived` otherwise. */
export function deleteCustomer(api: ApiClient, organizationId: string, id: string): Promise<void> {
  return api.send('DELETE', one(organizationId, id), undefined, noContent)
}
