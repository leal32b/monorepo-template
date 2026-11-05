import type { Kysely } from 'kysely'
import type { Invitations, StoredInvitation } from '../invitations.port'

/** The plugin's tables, as far as an invitation's recipient reads them (`migrations/0003_organizations.sql`). */
type InvitationTables = {
  invitation: {
    id: string
    email: string
    organizationId: string
    inviterId: string
    status: string
    expiresAt: Date
  }
  organization: { id: string; name: string; slug: string }
  user: { id: string; name: string }
}

/**
 * Invitations read straight from the organization plugin's tables, in one read with their
 * organization and inviter. Both always exist: an invitation cascades from each (ADR 0033).
 */
export class KyselyInvitations implements Invitations {
  readonly #db: Kysely<InvitationTables>

  constructor(db: Kysely<unknown>) {
    this.#db = (db as unknown as Kysely<InvitationTables>).withSchema('auth')
  }

  async find(invitationId: string): Promise<StoredInvitation | null> {
    const row = await this.#db
      .selectFrom('invitation')
      .innerJoin('organization', 'organization.id', 'invitation.organizationId')
      .innerJoin('user', 'user.id', 'invitation.inviterId')
      .select([
        'invitation.id',
        'invitation.email',
        'invitation.organizationId',
        'organization.name as organizationName',
        'organization.slug as organizationSlug',
        'user.name as inviterName',
        'invitation.status',
        'invitation.expiresAt'
      ])
      .where('invitation.id', '=', invitationId)
      .executeTakeFirst()
    return row ?? null
  }
}
