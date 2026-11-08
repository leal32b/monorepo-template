import type { AccountDeletion } from '@repo/contracts'
import { APIError } from 'better-auth/api'
import type { Kysely } from 'kysely'
import type { AccountDeletionPlan } from '../account-deletion.port'

/** The plugin's tables, as far as account deletion reads them (`migrations/0003_organizations.sql`). */
type DeletionTables = {
  organization: { id: string; name: string; slug: string }
  member: { organizationId: string; userId: string; role: string }
}

const isOwner = (roles: string) => roles.split(',').some((role) => role.trim() === 'owner')

/**
 * The tenancy rule of account deletion (ADR 0049), on the plugin's tables. An organization where the user
 * is the only member goes with the account; one where they are the only owner beside other members
 * blocks it, so no organization is left without an owner; any other they simply leave, since their
 * memberships go with the user row (`on delete cascade`).
 */
export class KyselyAccountDeletion implements AccountDeletionPlan {
  readonly #db: Kysely<DeletionTables>

  constructor(db: Kysely<unknown>) {
    this.#db = (db as unknown as Kysely<DeletionTables>).withSchema('auth')
  }

  async organizationsOf(userId: string): Promise<AccountDeletion['organizations']> {
    const mine = this.#db.selectFrom('member').select('organizationId').where('userId', '=', userId)
    const members = await this.#db
      .selectFrom('member')
      .innerJoin('organization', 'organization.id', 'member.organizationId')
      .select(['organization.id', 'organization.name', 'organization.slug', 'member.userId', 'member.role'])
      .where('member.organizationId', 'in', mine)
      .orderBy('organization.name')
      .orderBy('organization.id')
      .execute()
    const organizations = new Map<string, AccountDeletion['organizations'][number]>()
    for (const { id, name, slug } of members) {
      if (organizations.has(id)) continue
      const all = members.filter((member) => member.id === id)
      const me = all.find((member) => member.userId === userId) as (typeof all)[number]
      const otherOwners = all.filter((member) => member.userId !== userId && isOwner(member.role))
      const outcome = all.length === 1 ? 'deleted' : isOwner(me.role) && otherOwners.length === 0 ? 'blocked' : 'left'
      organizations.set(id, { id, name, slug, outcome })
    }
    return [...organizations.values()]
  }

  /** Refuses while an organization would be left without an owner; the web names them from `organizationsOf`. */
  async assertCanDelete(userId: string): Promise<void> {
    if ((await this.organizationsOf(userId)).some((organization) => organization.outcome === 'blocked')) {
      throw new APIError('FORBIDDEN', {
        code: 'SOLE_OWNER_OF_SHARED_ORGANIZATION',
        message: 'Make someone else an owner of each organization you share, or delete it, first'
      })
    }
  }

  /**
   * Right before the user row goes: checks the rule again, since it may have changed since the link was
   * sent, and deletes the organizations only they are in, with everything in them (`on delete cascade`).
   */
  async beforeDelete(userId: string): Promise<void> {
    await this.assertCanDelete(userId)
    const alone = (await this.organizationsOf(userId)).filter((organization) => organization.outcome === 'deleted')
    if (alone.length === 0) return
    await this.#db
      .deleteFrom('organization')
      .where(
        'id',
        'in',
        alone.map((organization) => organization.id)
      )
      .execute()
  }
}
