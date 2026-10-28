import { healthResponseSchema } from '@repo/contracts'
import { FixedClock } from '#libs/adapters/fixed-clock'
import { FakeDatabaseProbe } from '#modules/health/testing/fake-database-probe'
import { GetHealthService } from './get-health.service'

describe('GetHealthService', () => {
  const clock = new FixedClock(new Date('2026-10-17T12:00:00.000Z'))
  const database = new FakeDatabaseProbe()
  const service = new GetHealthService(clock, 'api', database)

  beforeEach(() => {
    database.reachable = true
  })

  it('reports ok when the database answers', async () => {
    expect(await service.execute()).toEqual({
      status: 'ok',
      service: 'api',
      timestamp: '2026-10-17T12:00:00.000Z',
      database: 'up'
    })
  })

  it('reports degraded when the database does not answer', async () => {
    database.reachable = false

    expect(await service.execute()).toEqual({
      status: 'degraded',
      service: 'api',
      timestamp: '2026-10-17T12:00:00.000Z',
      database: 'down'
    })
  })

  it.each([true, false])(
    'answers with a payload that satisfies the health contract (reachable: %s)',
    async (reachable) => {
      database.reachable = reachable

      expect(healthResponseSchema.safeParse(await service.execute()).success).toBe(true)
    }
  )
})
