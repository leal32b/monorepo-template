import {
  type Billing,
  type BillingCheckoutInput,
  type BillingPage,
  type BillingPlanInput,
  type BillingVersionInput,
  billingPageSchema,
  billingSchema
} from '@repo/contracts'
import { type ApiClient, noContent } from '#shared/api'

/** The owner's billing routes (ADR 0067): all of them `billing:manage`, open while the organization is read only. */
const base = (organizationId: string) => `/api/organizations/${encodeURIComponent(organizationId)}/billing`

/** The plan page's read: the subscription, the version to send back, the provider's reference and the open checkout's page. */
export function getBilling(api: ApiClient, organizationId: string): Promise<Billing> {
  return api.get(base(organizationId), billingSchema)
}

/** The provider's page for what is overdue, or `{ url: null }` when it has none: then a checkout pays it. */
export function getPaymentPage(api: ApiClient, organizationId: string): Promise<BillingPage> {
  return api.get(`${base(organizationId)}/payment-page`, billingPageSchema)
}

/**
 * Opens the provider's page for a plan (ADR 0063): `{ url }` to go to, or `{ url: null }` when the plan
 * changed at once, as an upgrade below the provider's minimum charge does. A second request for the same
 * plan gets the same page back.
 */
export function startCheckout(
  api: ApiClient,
  organizationId: string,
  input: BillingCheckoutInput
): Promise<BillingPage> {
  return api.send('POST', `${base(organizationId)}/checkout`, input, billingPageSchema)
}

/** "Cancel the upgrade": the provider's page is withdrawn, and nothing is charged. */
export function abandonCheckout(api: ApiClient, organizationId: string): Promise<void> {
  return api.send('DELETE', `${base(organizationId)}/checkout`, undefined, noContent)
}

/** A cheaper plan from the end of the paid period, or the current one again, which withdraws it. */
export function changePlan(api: ApiClient, organizationId: string, input: BillingPlanInput): Promise<void> {
  return api.send('PUT', `${base(organizationId)}/plan`, input, noContent)
}

/** "Cancel plan": it ends when the paid period ends, and can be kept until then. */
export function cancelSubscription(api: ApiClient, organizationId: string, input: BillingVersionInput): Promise<void> {
  return api.send('POST', `${base(organizationId)}/cancel`, input, noContent)
}

/** "Keep the plan": withdraws a scheduled end. */
export function resumeSubscription(api: ApiClient, organizationId: string, input: BillingVersionInput): Promise<void> {
  return api.send('POST', `${base(organizationId)}/resume`, input, noContent)
}
