import { type AuthClient, createQuery } from '#shared/api'
import { listOrganizations } from './list-organizations'

/**
 * The signed-in user's organizations, as a router query (ADR 0038): their route starts it at boot,
 * beside the session, and the provider of the screens below reads the same answer.
 */
export const organizationsQuery = (auth: AuthClient) => createQuery(() => listOrganizations(auth), 'organizations')
