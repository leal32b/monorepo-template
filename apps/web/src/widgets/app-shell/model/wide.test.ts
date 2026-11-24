import { createRoot } from 'solid-js'
import { createWide, wideQuery } from './wide'

/** A media query list whose answer the test changes, as the window's width would. */
function fakeMedia(matches: boolean) {
  const listeners = new Set<(event: MediaQueryListEvent) => void>()
  const media = {
    matches,
    addEventListener: (_: string, listener: (event: MediaQueryListEvent) => void) => listeners.add(listener),
    removeEventListener: (_: string, listener: (event: MediaQueryListEvent) => void) => listeners.delete(listener)
  }
  const matchMedia = vi.spyOn(window, 'matchMedia').mockReturnValue(media as unknown as MediaQueryList)
  return {
    matchMedia,
    listeners,
    change: (next: boolean) => {
      for (const listener of listeners) listener({ matches: next } as MediaQueryListEvent)
    }
  }
}

describe('createWide', () => {
  afterEach(() => vi.restoreAllMocks())

  it('says whether the window is as wide as `md`, and follows it as it changes', () => {
    const media = fakeMedia(false)

    createRoot((dispose) => {
      const wide = createWide()
      expect(media.matchMedia).toHaveBeenCalledWith(wideQuery)
      expect(wide()).toBe(false)
      media.change(true)
      expect(wide()).toBe(true)
      dispose()
    })

    expect(media.listeners.size).toBe(0)
  })
})
