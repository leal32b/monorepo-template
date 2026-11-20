import {
  type CheckoutKind,
  type PlanKey,
  plans,
  type SubscriptionState,
  type SubscriptionStatus,
  trialFrom
} from '@repo/contracts'
import { type Kysely, type RawBuilder, sql } from 'kysely'
import type {
  BackOfficeDirectory,
  DirectoryOrganization,
  DirectoryOrganizationDetail,
  DirectorySearch,
  DirectoryUser
} from '../back-office-unit-of-work.port'

/** The subscription's columns as a left join reads them: all null when the organization has no row (the trial). */
type SubscriptionColumns = {
  status: SubscriptionStatus | null
  plan: PlanKey | null
  next_plan: PlanKey | null
  trial_ends_at: Date | null
  period_starts_at: Date | null
  paid_through: Date | null
  past_due_since: Date | null
  cancel_at_period_end: boolean | null
  checkout_kind: CheckoutKind | null
  checkout_plan: PlanKey | null
  checkout_amount: number | null
}

const subscriptionColumns = sql.raw(
  'row.status, row.plan, row.next_plan, row.trial_ends_at, row.period_starts_at, row.paid_through, ' +
    'row.past_due_since, row.cancel_at_period_end, row.checkout_kind, row.checkout_plan, row.checkout_amount'
)

/** As the membership read builds it (ADR 0063): no row is the trial, counted from the organization's creation. */
function subscriptionOf(row: SubscriptionColumns, createdAt: Date): SubscriptionState {
  if (row.status === null) return trialFrom(createdAt)
  const checkoutPlan = row.checkout_plan as PlanKey
  return {
    status: row.status,
    plan: row.plan,
    nextPlan: row.next_plan,
    trialEndsAt: row.trial_ends_at as Date,
    periodStartsAt: row.period_starts_at,
    paidThrough: row.paid_through,
    pastDueSince: row.past_due_since,
    cancelAtPeriodEnd: row.cancel_at_period_end as boolean,
    checkout:
      row.checkout_kind === null
        ? null
        : {
            kind: row.checkout_kind,
            plan: checkoutPlan,
            amount: { amount: row.checkout_amount as number, currency: plans[checkoutPlan].price.currency }
          }
  }
}

/** `%words%` for `ilike`, with the pattern's own characters taken literally. */
const containing = (words: string) => `%${words.replace(/[\\%_]/g, (character) => `\\${character}`)}%`

/** Whether a member's roles (`owner,editor`) include the owner. */
const isOwner = (member: string) =>
  sql<boolean>`'owner' = any(string_to_array(replace(${sql.ref(member)}, ' ', ''), ','))`

/** The oldest owner of the organization in `organization.id` (ADR 0073 picks the same). */
const ownerOf = sql`
  select account.id, account.name, account.email
  from auth."member" member
  join auth."user" account on account.id = member."userId"
  where member."organizationId" = organization.id and ${isOwner('member.role')}
  order by member."createdAt", member."userId"
  limit 1
`

type OrganizationRow = SubscriptionColumns & {
  id: string
  name: string
  slug: string
  createdAt: Date
  owner_id: string | null
  owner_name: string | null
  owner_email: string | null
  members: number
}

/**
 * What the back office's screens read (ADR 0077), as `app_operator` in a read-only transaction: the columns
 * its grants name, newest first, a page at a time with the total of the search.
 */
export class KyselyBackOfficeDirectory implements BackOfficeDirectory {
  readonly #db: Kysely<unknown>

  constructor(db: Kysely<unknown>) {
    this.#db = db
  }

  async organizations({ search, page, pageSize }: DirectorySearch) {
    const matches: RawBuilder<boolean> =
      search === undefined
        ? sql<boolean>`true`
        : sql<boolean>`(organization.name ilike ${containing(search)} or organization.slug ilike ${containing(search)}
            or owner.email ilike ${containing(search)})`
    const from = sql`
      from auth."organization" organization
      left join lateral (${ownerOf}) owner on true
      where ${matches}
    `
    const { rows } = await sql<OrganizationRow>`
      select organization.id, organization.name, organization.slug, organization."createdAt",
        owner.id as owner_id, owner.name as owner_name, owner.email as owner_email,
        (select count(*)::int from auth."member" member where member."organizationId" = organization.id) as members,
        ${subscriptionColumns}
      from auth."organization" organization
      left join lateral (${ownerOf}) owner on true
      left join subscription row on row.organization_id = organization.id
      where ${matches}
      order by organization."createdAt" desc, organization.id
      limit ${pageSize} offset ${(page - 1) * pageSize}
    `.execute(this.#db)
    const counted = await sql<{ total: number }>`select count(*)::int as total ${from}`.execute(this.#db)
    return { items: rows.map(toOrganization), total: (counted.rows[0] as { total: number }).total }
  }

  async organization(organizationId: string): Promise<DirectoryOrganizationDetail | null> {
    const { rows } = await sql<
      SubscriptionColumns & {
        id: string
        name: string
        slug: string
        createdAt: Date
        timeZone: string
        currency: string
        members: { id: string; name: string; email: string; role: string; joinedAt: string }[]
      }
    >`
      select organization.id, organization.name, organization.slug, organization."createdAt",
        organization."timeZone", organization.currency, ${subscriptionColumns},
        coalesce((
          select json_agg(json_build_object(
            'id', account.id, 'name', account.name, 'email', account.email, 'role', member.role, 'joinedAt', member."createdAt"
          ) order by member."createdAt", member."userId")
          from auth."member" member join auth."user" account on account.id = member."userId"
          where member."organizationId" = organization.id
        ), '[]') as members
      from auth."organization" organization
      left join subscription row on row.organization_id = organization.id
      where organization.id = ${organizationId}
    `.execute(this.#db)
    const row = rows[0]
    if (row === undefined) return null
    return {
      id: row.id,
      name: row.name,
      slug: row.slug,
      createdAt: row.createdAt,
      timeZone: row.timeZone,
      currency: row.currency,
      subscription: subscriptionOf(row, row.createdAt),
      members: row.members.map((member) => ({ ...member, joinedAt: new Date(member.joinedAt) }))
    }
  }

  async users({ search, page, pageSize }: DirectorySearch) {
    const matches =
      search === undefined
        ? sql<boolean>`true`
        : sql<boolean>`(account.email ilike ${containing(search)} or account.name ilike ${containing(search)})`
    const { rows } = await sql<{
      id: string
      name: string
      email: string
      createdAt: Date
      last_sign_in_at: Date | null
      two_factor: boolean
      organizations: { id: string; name: string; slug: string; role: string }[]
    }>`
        select account.id, account.name, account.email, account."createdAt",
          coalesce(account."twoFactorEnabled", false) as two_factor,
          (select max(session."createdAt") from auth."session" session where session."userId" = account.id) as last_sign_in_at,
          coalesce((
            select json_agg(json_build_object(
              'id', organization.id, 'name', organization.name, 'slug', organization.slug, 'role', member.role
            ) order by organization.name, organization.id)
            from auth."member" member join auth."organization" organization on organization.id = member."organizationId"
            where member."userId" = account.id
          ), '[]') as organizations
        from auth."user" account
        where ${matches}
        order by account."createdAt" desc, account.id
        limit ${pageSize} offset ${(page - 1) * pageSize}
      `.execute(this.#db)
    const counted = await sql<{ total: number }>`
      select count(*)::int as total from auth."user" account where ${matches}
    `.execute(this.#db)
    const items: DirectoryUser[] = rows.map((row) => ({
      id: row.id,
      name: row.name,
      email: row.email,
      createdAt: row.createdAt,
      lastSignInAt: row.last_sign_in_at,
      twoFactor: row.two_factor,
      organizations: row.organizations
    }))
    return { items, total: (counted.rows[0] as { total: number }).total }
  }
}

function toOrganization(row: OrganizationRow): DirectoryOrganization {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    createdAt: row.createdAt,
    subscription: subscriptionOf(row, row.createdAt),
    owner:
      row.owner_id === null
        ? null
        : { id: row.owner_id, name: row.owner_name as string, email: row.owner_email as string },
    members: row.members
  }
}
