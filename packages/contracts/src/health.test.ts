import { healthResponseSchema, livenessResponseSchema } from './health'

const valid = {
  status: 'ok',
  service: 'api',
  timestamp: '2026-10-16T12:00:00.000Z',
  database: 'up'
}

describe('healthResponseSchema', () => {
  it('accepts a valid health response', () => {
    expect(healthResponseSchema.safeParse(valid).success).toBe(true)
  })

  it('accepts a degraded response when the database is down', () => {
    expect(healthResponseSchema.safeParse({ ...valid, status: 'degraded', database: 'down' }).success).toBe(true)
  })

  it.each([
    { status: 'ok', database: 'down' },
    { status: 'degraded', database: 'up' }
  ])('rejects the inconsistent pair %o', (pair) => {
    expect(healthResponseSchema.safeParse({ ...valid, ...pair }).success).toBe(false)
  })

  it('rejects an unknown status', () => {
    expect(healthResponseSchema.safeParse({ ...valid, status: 'down' }).success).toBe(false)
  })

  it('rejects a timestamp that is not an ISO 8601 date-time', () => {
    const result = healthResponseSchema.safeParse({
      ...valid,
      timestamp: 'yesterday'
    })

    expect(result.success).toBe(false)
  })
})

describe('livenessResponseSchema', () => {
  it('accepts { status: "ok" }', () => {
    expect(livenessResponseSchema.safeParse({ status: 'ok' }).success).toBe(true)
  })

  it('rejects anything else', () => {
    expect(livenessResponseSchema.safeParse({ status: 'degraded' }).success).toBe(false)
  })
})
