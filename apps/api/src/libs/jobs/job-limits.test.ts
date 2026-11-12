import { jobLimits, retryDelayMs } from './job-limits'

describe('retryDelayMs (ADR 0056)', () => {
  it('waits 30 s after the first failure and four times longer after each one', () => {
    expect([1, 2, 3, 4].map(retryDelayMs)).toEqual([30_000, 120_000, 480_000, 1_920_000])
  })

  it('never waits more than six hours', () => {
    expect(retryDelayMs(9)).toBe(6 * 60 * 60 * 1000)
    expect(retryDelayMs(500)).toBe(6 * 60 * 60 * 1000)
  })

  it('keeps the lease longer than a handler may take, so a running job is not taken twice', () => {
    expect(jobLimits.leaseMs).toBeGreaterThan(jobLimits.handlerTimeoutMs)
  })
})
