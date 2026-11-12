import { FixedClock } from '#libs/adapters/fixed-clock'
import type { RateLimit, RateLimiter } from '#libs/ports/rate-limiter.port'

export const start = new Date('2026-11-12T10:00:00.000Z')

const three: RateLimit = { name: 'test-three', max: 3, windowSeconds: 60 }

/**
 * What every `RateLimiter` must do (ADR 0059), run against the in-memory fake and the database
 * adapter alike: a fixed window per limit and subject, started by the first request.
 */
export function describeRateLimiter(label: string, make: (clock: FixedClock) => Promise<RateLimiter>): void {
  describe(`${label} as a RateLimiter`, () => {
    let clock: FixedClock
    let limiter: RateLimiter

    beforeEach(async () => {
      clock = new FixedClock(start)
      limiter = await make(clock)
    })

    const hits = async (times: number, subject = 'a') => {
      const verdicts = []
      for (let i = 0; i < times; i++) verdicts.push(await limiter.hit(three, subject))
      return verdicts
    }

    it('allows the limit, then refuses with the seconds left in the window', async () => {
      expect(await hits(3)).toEqual([{ allowed: true }, { allowed: true }, { allowed: true }])

      clock.advance(20_000)
      expect(await limiter.hit(three, 'a')).toEqual({ allowed: false, retryAfterSeconds: 40 })
    })

    it('allows again once the window has passed, and starts a new one there', async () => {
      await hits(4)

      clock.advance(60_000)
      expect(await hits(3)).toEqual([{ allowed: true }, { allowed: true }, { allowed: true }])
      expect(await limiter.hit(three, 'a')).toEqual({ allowed: false, retryAfterSeconds: 60 })
    })

    it('keeps the window where the first request started it, however many are refused', async () => {
      await hits(3)
      clock.advance(59_000)
      await hits(5)

      clock.advance(1_000)
      expect(await limiter.hit(three, 'a')).toEqual({ allowed: true })
    })

    it('never says to wait less than a second', async () => {
      await hits(3)

      clock.advance(59_800)
      expect(await limiter.hit(three, 'a')).toEqual({ allowed: false, retryAfterSeconds: 1 })
    })

    it('counts each subject and each limit apart', async () => {
      await hits(3)

      expect(await limiter.hit(three, 'b')).toEqual({ allowed: true })
      expect(await limiter.hit({ ...three, name: 'test-other' }, 'a')).toEqual({ allowed: true })
      expect(await limiter.hit(three, 'a')).toMatchObject({ allowed: false })
    })
  })
}
