import { type AuthClient, createQuery } from '#shared/api'
import { listMembers } from './list-members'

/** The members of an organization, as a router query keyed by its id (ADR 0038): every screen shares them. */
export const membersQuery = (auth: AuthClient) =>
  createQuery((organizationId: string) => listMembers(auth, organizationId), 'members')
