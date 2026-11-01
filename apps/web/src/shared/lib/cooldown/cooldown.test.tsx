import { createRoot } from 'solid-js'
import { createCooldown } from './cooldown'

describe('createCooldown', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('is over until started', () => {
    createRoot((dispose) => {
      const cooldown = createCooldown(30)

      expect(cooldown.remaining()).toBe(0)
      dispose()
    })
  })

  it('counts down in whole seconds, then stops at 0', () => {
    createRoot((dispose) => {
      const cooldown = createCooldown(3)

      cooldown.start()
      expect(cooldown.remaining()).toBe(3)
      vi.advanceTimersByTime(1000)
      expect(cooldown.remaining()).toBe(2)
      vi.advanceTimersByTime(2000)
      expect(cooldown.remaining()).toBe(0)
      vi.advanceTimersByTime(5000)
      expect(cooldown.remaining()).toBe(0)
      dispose()
    })
  })

  it('starts over when started again', () => {
    createRoot((dispose) => {
      const cooldown = createCooldown(3)
      cooldown.start()
      vi.advanceTimersByTime(2000)

      cooldown.start()

      expect(cooldown.remaining()).toBe(3)
      vi.advanceTimersByTime(1000)
      expect(cooldown.remaining()).toBe(2)
      dispose()
    })
  })

  it('stops counting when the screen goes away', () => {
    createRoot((dispose) => {
      const cooldown = createCooldown(3)
      cooldown.start()

      dispose()
      vi.advanceTimersByTime(3000)

      expect(cooldown.remaining()).toBe(3)
    })
  })
})
