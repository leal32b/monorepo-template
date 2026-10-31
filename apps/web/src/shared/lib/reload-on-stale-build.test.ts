import { reloadOnStaleBuild } from './reload-on-stale-build'

describe('reloadOnStaleBuild', () => {
  afterEach(() => sessionStorage.clear())

  function staleChunk() {
    const event = new Event('vite:preloadError', { cancelable: true })
    window.dispatchEvent(event)
    return event
  }

  it('reloads the page when a screen asks for a file a newer build replaced, and drops the error', () => {
    const reload = vi.fn()
    const stop = reloadOnStaleBuild(window, reload)

    const event = staleChunk()
    stop()

    expect(reload).toHaveBeenCalledTimes(1)
    expect(event.defaultPrevented).toBe(true)
  })

  it('reloads once: a file that is really missing does not loop', () => {
    const reload = vi.fn()
    const stop = reloadOnStaleBuild(window, reload)

    staleChunk()
    const second = staleChunk()
    stop()

    expect(reload).toHaveBeenCalledTimes(1)
    expect(second.defaultPrevented).toBe(false)
  })

  it('leaves the error alone when the browser keeps no session storage: it could not tell a second time', () => {
    const reload = vi.fn()
    vi.spyOn(window, 'sessionStorage', 'get').mockImplementation(() => {
      throw new Error('blocked')
    })
    const stop = reloadOnStaleBuild(window, reload)

    const event = staleChunk()
    stop()
    vi.restoreAllMocks()

    expect(reload).not.toHaveBeenCalled()
    expect(event.defaultPrevented).toBe(false)
  })

  it('stops listening when asked', () => {
    const reload = vi.fn()
    reloadOnStaleBuild(window, reload)()

    staleChunk()

    expect(reload).not.toHaveBeenCalled()
  })
})
