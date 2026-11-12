import { FixedClock } from './fixed-clock'
import { ManualTimer } from './manual-timer'

describe('ManualTimer', () => {
  const at = new Date('2026-11-11T09:00:00.000Z')
  const setup = () => {
    const clock = new FixedClock(at)
    return { clock, timer: new ManualTimer(clock) }
  }
  /** Whether `promise` has settled, once everything already queued has run. */
  const settled = async (promise: Promise<void>) => {
    let done = false
    void promise.then(() => {
      done = true
    })
    await new Promise((resolve) => setImmediate(resolve))
    return done
  }

  it('keeps a wait open until its time has been advanced past, and moves the clock', async () => {
    const { clock, timer } = setup()
    const waiting = timer.wait(1_000)

    timer.advance(999)
    expect(await settled(waiting)).toBe(false)

    timer.advance(1)
    expect(await settled(waiting)).toBe(true)
    expect(clock.now()).toEqual(new Date(at.getTime() + 1_000))
  })

  it('ends a wait when its signal aborts, and at once on a signal already aborted', async () => {
    const { timer } = setup()
    const wake = new AbortController()
    const waiting = timer.wait(1_000, wake.signal)

    wake.abort()

    expect(await settled(waiting)).toBe(true)
    expect(await settled(timer.wait(1_000, AbortSignal.abort()))).toBe(true)
    expect(timer.pending).toEqual([])
  })

  it('lists the waits still open, and each one ever asked for', async () => {
    const { timer } = setup()
    void timer.wait(500)
    void timer.wait(2_000)

    timer.advance(500)

    expect(timer.pending).toEqual([2_000])
    expect(timer.asked).toEqual([500, 2_000])
  })

  it('tells a test when a wait of a given length is open, now or later', async () => {
    const { timer } = setup()
    void timer.wait(500)

    await timer.parked(500)
    const later = timer.parked(2_000)
    expect(await settled(later)).toBe(false)

    void timer.wait(2_000)
    expect(await settled(later)).toBe(true)
  })
})
