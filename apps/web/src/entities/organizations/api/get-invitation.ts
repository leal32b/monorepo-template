import { type Invitation, invitationSchema } from '@repo/contracts'
import type { ApiClient } from '#shared/api'

/**
 * An invitation as its recipient sees it, whatever became of it (ADR 0033, D5). Fails with the API's
 * 404 for an id that does not exist and 403 for an account it was not sent to.
 */
export function getInvitation(api: ApiClient, invitationId: string): Promise<Invitation> {
  return api.get(`/api/invitations/${encodeURIComponent(invitationId)}`, invitationSchema)
}
