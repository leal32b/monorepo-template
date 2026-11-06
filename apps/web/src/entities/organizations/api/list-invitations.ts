import { ApiError, type AuthClient, createQuery } from '#shared/api'

/** An invitation the signed-in user can still answer. */
export type Invitation = { id: string; organizationName: string; expiresAt: Date }

/**
 * The invitations sent to the signed-in user's address that are still open. Better Auth keeps an
 * expired invitation as `pending` and lists it, so they are filtered here by `expiresAt` (the spike).
 * Fails like any call, with an `ApiError`.
 */
export async function listInvitations(auth: AuthClient, now: Date): Promise<Invitation[]> {
  let answer: Awaited<ReturnType<AuthClient['organization']['listUserInvitations']>>
  try {
    answer = await auth.organization.listUserInvitations()
  } catch (cause) {
    throw new ApiError('network', 'The invitations could not be read.', { cause })
  }
  if (answer.error) {
    throw new ApiError('http', `Better Auth answered ${answer.error.status}.`, { status: answer.error.status })
  }
  // The organization always exists: the invitation row cascades from it.
  const rows = answer.data as { id: string; organizationName: string; expiresAt: string | Date }[]
  return rows
    .map(({ id, organizationName, expiresAt }) => ({ id, organizationName, expiresAt: new Date(expiresAt) }))
    .filter((invitation) => invitation.expiresAt > now)
}

/** The invitations sent to the signed-in user, as a router query (ADR 0038): onboarding's route starts it. */
export const userInvitationsQuery = (auth: AuthClient) =>
  createQuery(() => listInvitations(auth, new Date()), 'user-invitations')
