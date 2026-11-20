import type { Locale } from '#libs/notifications/locales'
import type { ExportTable } from './export-table'

/** What the export reads of the organization outside the tenant tables: its plugin tables, and whom to tell. */
export type DirectoryRead = {
  /** The organization, its members, invitations and roles (ADR 0074): the plugin's tables, which no tenant transaction reads. */
  tables: ExportTable[]
  organization: { name: string; slug: string; timeZone: string }
  /** The owner who asked, while still a member: whom the email goes to, in their language. */
  requester: { email: string; locale: Locale } | null
}

/**
 * The organization as Better Auth's tables hold it (ADR 0074), read on the pool by its id, outside any unit of
 * work, as `OrganizationOwners` is (ADR 0073).
 */
export interface OrganizationDirectory {
  /** `null` when the organization is gone. */
  read(organizationId: string, requesterId: string): Promise<DirectoryRead | null>
}
