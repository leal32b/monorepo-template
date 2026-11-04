import { ApiError, type AuthClient } from '#shared/api'
import { type PendingInvitation, rolesOf } from '../lib/members'

/** The rows Better Auth sends for `list-invitations`, as far as the app reads them. */
type Row = { id: string; email: string; role: string | null; status: string; expiresAt: string }

/**
 * The invitations of an organization still waiting for an answer, not yet expired at `now` (D5): anyone in
 * the organization may read them. Fails like any call, with an `ApiError`.
 */
export async function listPendingInvitations(
  auth: AuthClient,
  organizationId: string,
  now: Date
): Promise<PendingInvitation[]> {
  let answer: Awaited<ReturnType<AuthClient['organization']['listInvitations']>>
  try {
    answer = await auth.organization.listInvitations({ query: { organizationId } })
  } catch (cause) {
    throw new ApiError('network', 'The invitations could not be read.', { cause })
  }
  if (answer.error) {
    throw new ApiError('http', `Better Auth answered ${answer.error.status}.`, { status: answer.error.status })
  }
  return (answer.data as unknown as Row[])
    .filter((row) => row.status === 'pending' && new Date(row.expiresAt) > now)
    .map((row) => ({
      id: row.id,
      email: row.email,
      roles: row.role ? rolesOf(row.role) : [],
      expiresAt: new Date(row.expiresAt)
    }))
}
