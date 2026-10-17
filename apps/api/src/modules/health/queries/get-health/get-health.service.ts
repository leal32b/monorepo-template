import type { HealthResponse } from '@template/contracts'
import type { Clock } from '#libs/ports/clock.port'

export class GetHealthService {
  constructor(
    private readonly clock: Clock,
    private readonly serviceName: string
  ) {}

  execute(): HealthResponse {
    return {
      status: 'ok',
      service: this.serviceName,
      timestamp: this.clock.now().toISOString()
    }
  }
}
