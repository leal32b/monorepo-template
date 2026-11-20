import { type Kysely, sql } from 'kysely'
import type { Clock } from '#libs/ports/clock.port'
import type { IdGenerator } from '#libs/ports/id-generator.port'
import type { BackOfficeUnitOfWork } from '../back-office-unit-of-work.port'
import { EndImpersonationService } from '../commands/end-impersonation/end-impersonation.service'

/** Why an account cannot be made an operator: each is a way to sign in without a second factor, or no account. */
export type GrantRefusal =
  | 'no-account'
  | 'email-not-confirmed'
  | 'two-factor-off'
  | 'other-sign-in'
  | 'already-operator'

export type OperatorRecord = {
  email: string
  grantedAt: Date
  grantedBy: string
  revokedAt: Date | null
  revokedBy: string | null
}

/**
 * Who is an operator (ADR 0077), changed only here, by the `operator` command run with the database owner's
 * credentials: no route and no role of the API can write the table. Revoking ends the operator's visit, with its
 * entry in the organization's trail.
 */
export class OperatorGrants {
  constructor(
    private readonly db: Kysely<unknown>,
    private readonly deps: { unitOfWork: BackOfficeUnitOfWork; ids: IdGenerator; clock: Clock }
  ) {}

  /** Makes the account of `email` an operator, on `by`'s word, or says why not. */
  async grant(email: string, by: string): Promise<{ granted: true } | { granted: false; refusal: GrantRefusal }> {
    const { rows } = await sql<{
      id: string
      confirmed: boolean
      two_factor: boolean
      other: boolean
      operator: boolean
    }>`
      select account.id, account."emailVerified" as confirmed, coalesce(account."twoFactorEnabled", false) as two_factor,
        exists (select from auth."account" method where method."userId" = account.id and method."providerId" <> 'credential') as other,
        exists (select from operator where operator.user_id = account.id and operator.revoked_at is null) as operator
      from auth."user" account
      where lower(account.email) = lower(${email})
    `.execute(this.db)
    const account = rows[0]
    const refusal: GrantRefusal | undefined =
      account === undefined
        ? 'no-account'
        : !account.confirmed
          ? 'email-not-confirmed'
          : !account.two_factor
            ? 'two-factor-off'
            : account.other
              ? 'other-sign-in'
              : account.operator
                ? 'already-operator'
                : undefined
    if (refusal !== undefined) return { granted: false, refusal }
    await sql`
      insert into operator (id, user_id, granted_at, granted_by)
      values (${this.deps.ids.generate()}, ${(account as { id: string }).id}, ${this.deps.clock.now()}, ${by})
    `.execute(this.db)
    return { granted: true }
  }

  /** Revokes the operator of `email`, on `by`'s word, and ends their visit; `false` when there was none. */
  async revoke(email: string, by: string): Promise<boolean> {
    const { rows } = await sql<{ user_id: string }>`
      update operator set revoked_at = ${this.deps.clock.now()}, revoked_by = ${by}
      where revoked_at is null and user_id in (select id from auth."user" where lower(email) = lower(${email}))
      returning user_id
    `.execute(this.db)
    const revoked = rows[0]
    if (revoked === undefined) return false
    const { unitOfWork, ids, clock } = this.deps
    const visit = await unitOfWork.read(({ impersonations }) => impersonations.active(revoked.user_id))
    if (visit !== null) await new EndImpersonationService(unitOfWork, ids, clock).end(visit.id, 'revoked')
    return true
  }

  /** Every operator there has been, the newest grant first: the record of who, when and on whose word. */
  async list(): Promise<OperatorRecord[]> {
    const { rows } = await sql<OperatorRecord>`
      select account.email, operator.granted_at as "grantedAt", operator.granted_by as "grantedBy",
        operator.revoked_at as "revokedAt", operator.revoked_by as "revokedBy"
      from operator join auth."user" account on account.id = operator.user_id
      order by operator.granted_at desc, operator.id
    `.execute(this.db)
    return rows
  }
}
