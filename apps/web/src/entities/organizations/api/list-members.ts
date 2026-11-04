import { ApiError, type AuthClient } from '#shared/api'
import { type Member, rolesOf } from '../lib/members'

/** The rows Better Auth sends for `list-members`, as far as the app reads them. */
type Row = { id: string; userId: string; role: string; createdAt: string; user: { name: string; email: string } }

/**
 * The members of an organization, from Better Auth (ADR 0033): anyone in it may read the list. Fails like
 * any call, with an `ApiError`: the answer's status, or `network` when the API cannot be reached.
 */
export async function listMembers(auth: AuthClient, organizationId: string): Promise<Member[]> {
  let answer: Awaited<ReturnType<AuthClient['organization']['listMembers']>>
  try {
    answer = await auth.organization.listMembers({ query: { organizationId } })
  } catch (cause) {
    throw new ApiError('network', 'The members could not be read.', { cause })
  }
  if (answer.error) {
    throw new ApiError('http', `Better Auth answered ${answer.error.status}.`, { status: answer.error.status })
  }
  return (answer.data.members as unknown as Row[]).map((row) => ({
    id: row.id,
    userId: row.userId,
    name: row.user.name,
    email: row.user.email,
    roles: rolesOf(row.role),
    createdAt: new Date(row.createdAt)
  }))
}
