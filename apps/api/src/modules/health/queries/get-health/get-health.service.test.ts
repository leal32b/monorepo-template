import { healthResponseSchema } from '@template/contracts'
import { FixedClock } from '#libs/adapters/fixed-clock'
import { GetHealthService } from './get-health.service'

describe('GetHealthService', () => {
  const clock = new FixedClock(new Date('2026-10-17T12:00:00.000Z'))
  const service = new GetHealthService(clock, 'api')

  it('reports ok with the service name and the current time', () => {
    expect(service.execute()).toEqual({
      status: 'ok',
      service: 'api',
      timestamp: '2026-10-17T12:00:00.000Z'
    })
  })

  it('answers with a payload that satisfies the health contract', () => {
    expect(healthResponseSchema.safeParse(service.execute()).success).toBe(true)
  })
})
