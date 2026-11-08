import type { Customer as CustomerResponse, CustomerValues } from '@repo/contracts'
import type { Customer, CustomerDetails } from './domain/customer'

/** A domain customer in the shape of the contract: dates as ISO 8601. */
export function toCustomerResponse(customer: Customer): CustomerResponse {
  return {
    id: customer.id,
    name: customer.name,
    email: customer.email,
    phone: customer.phone,
    company: customer.company,
    notes: customer.notes,
    createdAt: customer.createdAt.toISOString(),
    updatedAt: customer.updatedAt.toISOString(),
    archivedAt: customer.archivedAt?.toISOString() ?? null,
    version: customer.version
  }
}

/** A parsed body as domain details: a field the client left out is empty, like one it left blank. */
export function toDetails(values: CustomerValues): CustomerDetails {
  return {
    name: values.name,
    email: values.email ?? null,
    phone: values.phone ?? null,
    company: values.company ?? null,
    notes: values.notes ?? null
  }
}
