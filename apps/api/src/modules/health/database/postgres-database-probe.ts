import { type Kysely, sql } from 'kysely'
import type { DatabaseProbe } from '../database-probe.port'

/** `select 1` with a deadline: a refused, failed or stuck database is unreachable (ADR 0014). */
export class PostgresDatabaseProbe implements DatabaseProbe {
  constructor(
    private readonly db: Kysely<unknown>,
    private readonly timeoutMs: number
  ) {}

  async isReachable(): Promise<boolean> {
    let timer: ReturnType<typeof setTimeout> | undefined
    const deadline = new Promise<false>((resolve) => {
      timer = setTimeout(() => resolve(false), this.timeoutMs)
    })
    const ping = sql`select 1`.execute(this.db).then(
      () => true,
      () => false
    )
    try {
      return await Promise.race([ping, deadline])
    } finally {
      clearTimeout(timer)
    }
  }
}
