import { type Kysely, type RawBuilder, sql } from 'kysely'

/**
 * How long each kind of identity row is kept once it is of no use (ADR 0050). A product changes them
 * here. A session or a verification token is useless the moment it expires; a rate-limit counter
 * after its window (60 s at most); an expired invitation is kept a while so support can still see why
 * it did not work; an account never confirmed frees its address after a week (threat model).
 */
export const identityRetention = {
  rateLimitHours: 24,
  expiredInvitationDays: 30,
  unconfirmedAccountDays: 7
}

/** Rows deleted per statement, so a large backlog never runs into the statement limit (ADR 0047). */
const BATCH_SIZE = 5000

export type IdentityPurge = {
  sessions: number
  verifications: number
  rateLimits: number
  invitations: number
  unconfirmedAccounts: number
}

/**
 * Deletes, in batches, the rows of `table` that `where` matches, and returns how many went. Each batch
 * is a statement of its own, so it holds behind a transaction pooler and frees its locks at once.
 */
async function deleteInBatches(
  db: Kysely<unknown>,
  table: string,
  where: RawBuilder<boolean>,
  batchSize: number
): Promise<number> {
  let total = 0
  for (;;) {
    const { numAffectedRows } = await sql`
      delete from ${sql.table(table)}
      where id in (select id from ${sql.table(table)} where ${where} limit ${batchSize})
    `.execute(db)
    const deleted = Number(numAffectedRows)
    total += deleted
    if (deleted < batchSize) return total
  }
}

const daysBefore = (now: Date, days: number) => new Date(now.getTime() - days * 24 * 60 * 60 * 1000)

/**
 * Deletes the identity rows past their use, as of `now` (ADR 0050). Idempotent: a second run finds
 * nothing. An account never confirmed goes with its sessions and sign-in methods (`on delete cascade`);
 * it cannot have joined an organization, since joining needs a confirmed email.
 */
export async function purgeExpiredIdentityRows(
  db: Kysely<unknown>,
  now: Date,
  { batchSize = BATCH_SIZE }: { batchSize?: number } = {}
): Promise<IdentityPurge> {
  const purge = (table: string, where: RawBuilder<boolean>) => deleteInBatches(db, `auth.${table}`, where, batchSize)
  const unconfirmedAccounts = await purge(
    'user',
    sql`${sql.ref('emailVerified')} = false and ${sql.ref('createdAt')} < ${daysBefore(now, identityRetention.unconfirmedAccountDays)}`
  )
  return {
    unconfirmedAccounts,
    sessions: await purge('session', sql`${sql.ref('expiresAt')} < ${now}`),
    verifications: await purge('verification', sql`${sql.ref('expiresAt')} < ${now}`),
    rateLimits: await purge(
      'rateLimit',
      sql`${sql.ref('lastRequest')} < ${now.getTime() - identityRetention.rateLimitHours * 60 * 60 * 1000}`
    ),
    invitations: await purge(
      'invitation',
      sql`${sql.ref('status')} = 'pending' and ${sql.ref('expiresAt')} < ${daysBefore(now, identityRetention.expiredInvitationDays)}`
    )
  }
}
