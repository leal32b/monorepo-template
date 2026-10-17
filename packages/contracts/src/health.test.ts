import { healthResponseSchema } from './health'

const valid = {
  status: 'ok',
  service: 'api',
  timestamp: '2026-10-16T12:00:00.000Z'
}

describe('healthResponseSchema', () => {
  it('accepts a valid health response', () => {
    expect(healthResponseSchema.safeParse(valid).success).toBe(true)
  })

  it('rejects a status other than "ok"', () => {
    const result = healthResponseSchema.safeParse({
      ...valid,
      status: 'down'
    })

    expect(result.success).toBe(false)
  })

  it('rejects a timestamp that is not an ISO 8601 date-time', () => {
    const result = healthResponseSchema.safeParse({
      ...valid,
      timestamp: 'yesterday'
    })

    expect(result.success).toBe(false)
  })
})
