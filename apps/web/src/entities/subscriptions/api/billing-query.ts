import { type ApiClient, createQuery } from '#shared/api'
import { getBilling } from './billing-api'

/**
 * The plan page's billing of an organization, as a router query keyed by its id (ADR 0038): the route's
 * `preload` and the page share one request, and a change reads it again by its key (`readAgain`).
 */
export const billingQuery = (api: ApiClient) =>
  createQuery((organizationId: string) => getBilling(api, organizationId), 'billing')
