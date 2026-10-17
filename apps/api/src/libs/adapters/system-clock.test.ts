import { SystemClock } from './system-clock'

describe('SystemClock', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('returns the current system time', () => {
    vi.setSystemTime(new Date('2026-10-17T12:00:00.000Z'))

    expect(new SystemClock().now()).toEqual(new Date('2026-10-17T12:00:00.000Z'))
  })
})
