import { exportLimits, organizationExportSchema } from './data-export'

describe('exportLimits', () => {
  it('lets an organization ask every 15 minutes and keeps a file 7 days (ADR 0074)', () => {
    expect(exportLimits).toEqual({ everyMinutes: 15, keepDays: 7 })
  })
})

describe('organizationExportSchema', () => {
  const requestedAt = '2026-11-19T12:00:00.000Z'
  const nextRequestAt = '2026-11-19T12:15:00.000Z'
  const expiresAt = '2026-11-26T12:00:05.000Z'

  it.each([
    ['none asked for yet', { status: 'none' }],
    ['one being prepared', { status: 'pending', requestedAt, nextRequestAt }],
    ['one ready, with its size', { status: 'ready', requestedAt, expiresAt, size: 2048, nextRequestAt: null }],
    ['one expired', { status: 'expired', requestedAt, expiresAt, nextRequestAt: null }]
  ])('reads %s', (_case, state) => {
    expect(organizationExportSchema.parse(state)).toEqual(state)
  })

  it.each([
    ['a ready one without its size', { status: 'ready', requestedAt, expiresAt, nextRequestAt: null }],
    ['a negative size', { status: 'ready', requestedAt, expiresAt, size: -1, nextRequestAt: null }],
    ['an unknown status', { status: 'failed', requestedAt, nextRequestAt: null }]
  ])('refuses %s', (_case, state) => {
    expect(organizationExportSchema.safeParse(state).success).toBe(false)
  })
})
