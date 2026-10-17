import { FixedClock } from './fixed-clock'

describe('FixedClock', () => {
  const at = new Date('2026-10-17T12:00:00.000Z')

  it('always returns the instant it was given', () => {
    const clock = new FixedClock(at)

    expect(clock.now()).toEqual(at)
    expect(clock.now()).toEqual(at)
  })

  it('moves forward when advanced', () => {
    const clock = new FixedClock(at)

    clock.advance(60_000)

    expect(clock.now()).toEqual(new Date('2026-10-17T12:01:00.000Z'))
  })

  it('does not let callers mutate its internal time', () => {
    const clock = new FixedClock(at)

    clock.now().setFullYear(1999)

    expect(clock.now()).toEqual(at)
  })
})
