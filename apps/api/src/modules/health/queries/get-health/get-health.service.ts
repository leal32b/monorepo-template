import type { HealthResponse } from '@repo/contracts'
import type { Clock } from '#libs/ports/clock.port'
import type { DatabaseProbe } from '#modules/health/database-probe.port'

/** Which service answers, and which version of it (ADR 0046). */
export type ServiceIdentity = { name: string; release: string }

export class GetHealthService {
  constructor(
    private readonly clock: Clock,
    private readonly service: ServiceIdentity,
    private readonly database: DatabaseProbe
  ) {}

  async execute(): Promise<HealthResponse> {
    const reachable = await this.database.isReachable()
    const { name, release } = this.service
    const answer = { service: name, release, timestamp: this.clock.now().toISOString() }
    return reachable ? { ...answer, status: 'ok', database: 'up' } : { ...answer, status: 'degraded', database: 'down' }
  }
}
