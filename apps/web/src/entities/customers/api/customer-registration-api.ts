import {
  type PublicCustomerRegistration,
  type PublicCustomerRegistrationInput,
  publicCustomerRegistrationSchema
} from '@repo/contracts'
import type { ApiClient } from '#shared/api'

/**
 * `POST /api/public/organizations/:organizationSlug/customer-registrations`: a visitor, with no session,
 * asks to be registered as a customer (ADR 0059). The API answers `202 { received: true }` whatever it
 * found, so the answer says the request was taken in, never whether a customer was created.
 */
export function registerAsCustomer(
  api: ApiClient,
  organizationSlug: string,
  input: PublicCustomerRegistrationInput
): Promise<PublicCustomerRegistration> {
  return api.send(
    'POST',
    `/api/public/organizations/${encodeURIComponent(organizationSlug)}/customer-registrations`,
    input,
    publicCustomerRegistrationSchema
  )
}
