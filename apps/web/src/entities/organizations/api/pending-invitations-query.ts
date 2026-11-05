import { type AuthClient, createQuery } from '#shared/api'
import { listPendingInvitations } from './list-pending-invitations'

/**
 * The invitations of an organization still waiting for an answer, as a router query keyed by its id
 * (ADR 0038): every screen shares them, each read leaving out the ones expired by then.
 */
export const pendingInvitationsQuery = (auth: AuthClient) =>
  createQuery(
    (organizationId: string) => listPendingInvitations(auth, organizationId, new Date()),
    'pending-invitations'
  )
