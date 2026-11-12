import { SystemTimer } from './system-timer'

describe('SystemTimer', () => {
  const timer = new SystemTimer()

  it('resolves once the time has passed', async () => {
    const before = performance.now()

    await timer.wait(20)

    expect(performance.now() - before).toBeGreaterThanOrEqual(15)
  })

  it('resolves as soon as the signal aborts', async () => {
    const wake = new AbortController()
    const before = performance.now()

    const waiting = timer.wait(60_000, wake.signal)
    wake.abort()
    await waiting

    expect(performance.now() - before).toBeLessThan(1_000)
  })

  it('does not wait at all on a signal already aborted', async () => {
    const before = performance.now()

    await timer.wait(60_000, AbortSignal.abort())

    expect(performance.now() - before).toBeLessThan(1_000)
  })
})
