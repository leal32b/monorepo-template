import type { HealthResponse } from '@repo/contracts'
import type { Clock } from '#libs/ports/clock.port'
import type { DatabaseProbe } from '#modules/health/database-probe.port'

export class GetHealthService {
  constructor(
    private readonly clock: Clock,
    private readonly serviceName: string,
    private readonly database: DatabaseProbe
  ) {}

  async execute(): Promise<HealthResponse> {
    const reachable = await this.database.isReachable()
    const answer = { service: this.serviceName, timestamp: this.clock.now().toISOString() }
    return reachable ? { ...answer, status: 'ok', database: 'up' } : { ...answer, status: 'degraded', database: 'down' }
  }
}
