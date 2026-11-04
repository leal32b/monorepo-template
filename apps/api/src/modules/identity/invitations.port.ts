/** An invitation as the organization plugin stores it, with the names the recipient needs to see. */
export type StoredInvitation = {
  id: string
  /** The invited address, as the inviter typed it. */
  email: string
  organizationId: string
  organizationName: string
  organizationSlug: string
  inviterName: string
  /** The plugin's own status: `pending`, `accepted`, `rejected` or `canceled`. */
  status: string
  expiresAt: Date
}

/** The invitations of every organization, read by id. */
export interface Invitations {
  /** The invitation, or `null` when there is none with that id. */
  find(invitationId: string): Promise<StoredInvitation | null>
}
