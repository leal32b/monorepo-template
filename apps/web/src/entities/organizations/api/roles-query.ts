import { type AuthClient, createQuery } from '#shared/api'
import { listRoles } from './list-roles'

/** The roles of an organization, as a router query keyed by its id (ADR 0038): every screen shares them. */
export const rolesQuery = (auth: AuthClient) =>
  createQuery((organizationId: string) => listRoles(auth, organizationId), 'roles')
