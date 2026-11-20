import type { SubscriptionState } from '@repo/contracts'
import type { AuditTrail } from '#libs/ports/audit-trail.port'
import type { JobQueue } from '#libs/ports/job-queue.port'

/** An active operator, as the back office's guard reads them (ADR 0077). */
export type OperatorAccount = {
  userId: string
  grantedAt: Date
  twoFactorEnabled: boolean
  /** The account signs in some other way than its password, such as Google, which asks for no code. */
  signsInOtherwise: boolean
}

/** Who may run the back office. */
export interface Operators {
  /** The active operator of this user id, or `null`: never one, or revoked. */
  find(userId: string): Promise<OperatorAccount | null>
}

/** A page of one of the back office's searches: words to find (none is `undefined`), the page and its size. */
export type DirectorySearch = { search: string | undefined; page: number; pageSize: number }

type Person = { id: string; name: string; email: string }

export type DirectoryOrganization = {
  id: string
  name: string
  slug: string
  createdAt: Date
  subscription: SubscriptionState
  owner: Person | null
  members: number
}

export type DirectoryOrganizationDetail = Omit<DirectoryOrganization, 'owner' | 'members'> & {
  timeZone: string
  currency: string
  members: (Person & { role: string; joinedAt: Date })[]
}

export type DirectoryUser = Person & {
  createdAt: Date
  lastSignInAt: Date | null
  twoFactor: boolean
  organizations: { id: string; name: string; slug: string; role: string }[]
}

/** What the back office's screens read of every organization and user, through the operator role. */
export interface BackOfficeDirectory {
  organizations(search: DirectorySearch): Promise<{ items: DirectoryOrganization[]; total: number }>
  organization(organizationId: string): Promise<DirectoryOrganizationDetail | null>
  users(search: DirectorySearch): Promise<{ items: DirectoryUser[]; total: number }>
}

export type EndReason = 'left' | 'expired' | 'revoked'

/** An operator's visit to an organization (ADR 0077). */
export type ImpersonationRecord = {
  id: string
  operatorId: string
  organization: { id: string; name: string; slug: string; timeZone: string; currency: string }
  startedAt: Date
  expiresAt: Date
}

export interface Impersonations {
  /** The operator's visit that has not ended, past its time or not. */
  active(operatorId: string): Promise<ImpersonationRecord | null>
  /** Fails when the operator has one that has not ended. */
  start(visit: {
    id: string
    operatorId: string
    organizationId: string
    startedAt: Date
    expiresAt: Date
  }): Promise<void>
  /** Ends the visit if it has not ended; `null` when it had, or is not there. Its organization otherwise. */
  end(id: string, at: Date, reason: EndReason): Promise<{ organizationId: string; operatorId: string } | null>
}

/** What the back office reads, in a read-only transaction. */
export type BackOfficeReads = { operators: Operators; directory: BackOfficeDirectory; impersonations: Impersonations }

/** What entering and leaving an organization write. */
export type BackOfficeWrites = { impersonations: Impersonations; audit: AuditTrail; jobs: JobQueue }

/**
 * The back office's database work (ADR 0077), as the role `app_operator`: `read` in a read-only transaction,
 * `write` for entering and leaving an organization, whose grants are all it can write. When `work` throws,
 * nothing it wrote is kept.
 */
export interface BackOfficeUnitOfWork {
  read<T>(work: (repositories: BackOfficeReads) => Promise<T>): Promise<T>
  write<T>(work: (repositories: BackOfficeWrites) => Promise<T>): Promise<T>
}
