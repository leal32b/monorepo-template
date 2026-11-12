import { type PublicOrganization, publicOrganizationSchema } from '@repo/contracts'
import { type ApiClient, createQuery } from '#shared/api'

/**
 * `GET /api/public/organizations/:organizationSlug`: an organization as anyone may see it, with no session
 * (ADR 0059). Fails with the API's 404 for a slug no organization has, and its 429 past the limit.
 */
export function getPublicOrganization(api: ApiClient, slug: string): Promise<PublicOrganization> {
  return api.get(`/api/public/organizations/${encodeURIComponent(slug)}`, publicOrganizationSchema)
}

/**
 * The organization of a public page, as a router query keyed by its slug (ADR 0038, ADR 0060): the route
 * starts it as it opens, and every public page of that organization shares the read.
 */
export const publicOrganizationQuery = (api: ApiClient) =>
  createQuery((slug: string) => getPublicOrganization(api, slug), 'public-organization')
