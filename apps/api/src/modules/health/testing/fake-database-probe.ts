import type { DatabaseProbe } from '../database-probe.port'

/** Test double: the database answers until a test says otherwise. */
export class FakeDatabaseProbe implements DatabaseProbe {
  reachable = true

  async isReachable(): Promise<boolean> {
    return this.reachable
  }
}
