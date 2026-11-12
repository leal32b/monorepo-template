import { type ApiClient, createQuery } from '#shared/api'
import { getMembership } from './get-membership'

/**
 * What the caller may do in an organization, as a router query keyed by its id (ADR 0038): the frame of
 * its screens and a route's `preload` that must know a permission before it reads share one request.
 */
export const membershipQuery = (api: ApiClient) =>
  createQuery((organizationId: string) => getMembership(api, organizationId), 'membership')
