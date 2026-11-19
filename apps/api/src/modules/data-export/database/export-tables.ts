/**
 * One file of the export and the table it is read from (ADR 0074): the columns it holds, in that order, and
 * every other column of the table with the reason it is left out. A db test fails on a column that is in
 * neither, so a new column is a decision, never a leak or an omission by default.
 */
export type ExportTableSpec = {
  /** The file's name without `.csv`. */
  file: string
  table: string
  /** The column that names the organization. */
  organizationColumn: string
  columns: readonly string[]
  /** Every other column, with why. */
  leftOut: Readonly<Record<string, string>>
  orderBy: string
}

const theOrganization = 'the organization, the same on every row'

/**
 * Better Auth's tables of the organization (ADR 0033), in schema `auth`, which no tenant transaction reads:
 * read on the pool, by the organization's id. Each member's name and email come from `auth.user`, by
 * `userId`, and nothing else of the user: no session, sign-in method, password hash, two-step secret or
 * language (`auth.session`, `auth.account`, `auth.twoFactor` and `auth.verification` are never read).
 */
export const pluginTables = [
  {
    file: 'organization',
    table: 'organization',
    organizationColumn: 'id',
    columns: ['id', 'name', 'slug', 'timeZone', 'currency', 'createdAt'],
    leftOut: { logo: 'never set by the template', metadata: "the plugin's own, never set by the template" },
    orderBy: 'id'
  },
  {
    file: 'members',
    table: 'member',
    organizationColumn: 'organizationId',
    columns: ['id', 'userId', 'role', 'createdAt'],
    leftOut: { organizationId: theOrganization },
    orderBy: 'createdAt'
  },
  {
    file: 'invitations',
    table: 'invitation',
    organizationColumn: 'organizationId',
    columns: ['id', 'email', 'role', 'status', 'expiresAt', 'createdAt', 'inviterId'],
    leftOut: { organizationId: theOrganization },
    orderBy: 'createdAt'
  },
  {
    file: 'roles',
    table: 'organizationRole',
    organizationColumn: 'organizationId',
    columns: ['id', 'role', 'permission', 'createdAt', 'updatedAt'],
    leftOut: { organizationId: theOrganization },
    orderBy: 'createdAt'
  }
] as const satisfies readonly ExportTableSpec[]

/** What each member's row adds from `auth.user`. */
export const memberUserColumns = ['name', 'email'] as const

/**
 * The tenant tables (ADR 0055), read in one unit of work as `app_tenant`, so row-level security returns the
 * organization's rows alone. A product's new tenant table joins here, or `notExported` says why not.
 */
export const tenantTables = [
  {
    file: 'customers',
    table: 'customer',
    organizationColumn: 'organization_id',
    columns: ['id', 'name', 'email', 'phone', 'company', 'notes', 'created_at', 'updated_at', 'archived_at'],
    leftOut: { organization_id: theOrganization, version: 'a counter for concurrent saves (ADR 0048)' },
    orderBy: 'created_at'
  },
  {
    file: 'activity',
    table: 'audit_entry',
    organizationColumn: 'organization_id',
    columns: ['id', 'at', 'actor_kind', 'actor_id', 'resource_type', 'resource_id', 'action', 'fields'],
    leftOut: { organization_id: theOrganization },
    orderBy: 'at'
  },
  {
    file: 'subscription',
    table: 'subscription',
    organizationColumn: 'organization_id',
    columns: [
      'status',
      'plan',
      'next_plan',
      'trial_ends_at',
      'period_starts_at',
      'paid_through',
      'past_due_since',
      'cancel_at_period_end',
      'created_at',
      'updated_at'
    ],
    leftOut: {
      organization_id: theOrganization,
      provider: "the payment provider's name: ours, not the organization's",
      provider_customer_id: "the provider's reference, not the organization's data",
      provider_subscription_id: "the provider's reference, not the organization's data",
      checkout_kind: 'a payment in progress, which the plan page shows',
      checkout_plan: 'a payment in progress, which the plan page shows',
      checkout_amount: 'a payment in progress, which the plan page shows',
      checkout_id: "the provider's reference, not the organization's data",
      checkout_url: "the provider's payment page, which may still work",
      checkout_expires_at: 'a payment in progress, which the plan page shows',
      version: 'a counter for concurrent saves (ADR 0048)'
    },
    orderBy: 'organization_id'
  }
] as const satisfies readonly ExportTableSpec[]

/** Tenant tables the export does not hold, with why. */
export const notExported: Readonly<Record<string, string>> = {
  organization_export: 'the export itself'
}
