import { type Kysely, sql } from 'kysely'
import type { OperatorAccount, Operators } from '../back-office-unit-of-work.port'

/** The active operator and what the guard checks of their account, in one statement, as `app_operator` (ADR 0077). */
export class KyselyOperators implements Operators {
  readonly #db: Kysely<unknown>

  constructor(db: Kysely<unknown>) {
    this.#db = db
  }

  async find(userId: string): Promise<OperatorAccount | null> {
    const { rows } = await sql<{ granted_at: Date; two_factor: boolean; other: boolean }>`
      select operator.granted_at, coalesce(account."twoFactorEnabled", false) as two_factor,
        exists (
          select from auth."account" method
          where method."userId" = operator.user_id and method."providerId" <> 'credential'
        ) as other
      from operator
      join auth."user" account on account.id = operator.user_id
      where operator.user_id = ${userId} and operator.revoked_at is null
    `.execute(this.#db)
    const row = rows[0]
    return row === undefined
      ? null
      : { userId, grantedAt: row.granted_at, twoFactorEnabled: row.two_factor, signsInOtherwise: row.other }
  }
}
