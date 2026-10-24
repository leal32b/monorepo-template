import type { AddressInfo } from 'node:net'
import { apiProblemSchema, healthResponseSchema } from '@repo/contracts'
import pino from 'pino'
import { FixedClock } from '#libs/adapters/fixed-clock'
import { createApp } from './create-app'

describe('API', () => {
  const clock = new FixedClock(new Date('2026-10-17T12:00:00.000Z'))
  const server = createApp({ clock, logger: pino({ level: 'silent' }), serviceName: 'api' })
  let url: string

  beforeAll(async () => {
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
    url = `http://127.0.0.1:${(server.address() as AddressInfo).port}`
  })

  afterAll(() => new Promise<void>((resolve) => server.close(() => resolve())))

  it('GET /api/health answers ok, as the health contract says', async () => {
    const response = await fetch(`${url}/api/health`)

    expect(response.status).toBe(200)
    expect(healthResponseSchema.parse(await response.json())).toEqual({
      status: 'ok',
      service: 'api',
      timestamp: '2026-10-17T12:00:00.000Z'
    })
  })

  it('does not accept writes on /api/health', async () => {
    const response = await fetch(`${url}/api/health`, { method: 'POST' })

    expect(response.status).toBe(405)
    expect(apiProblemSchema.parse(await response.json()).code).toBe('method_not_allowed')
  })
})
