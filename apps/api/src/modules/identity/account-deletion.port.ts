import type { AccountDeletion } from '@repo/contracts'

/** What deleting an account does to the organizations of its user (ADR 0049). */
export interface AccountDeletionPlan {
  /** Every organization `userId` is in, by name, with what deleting the account does to it. */
  organizationsOf(userId: string): Promise<AccountDeletion['organizations']>
}
