const RELOADED = 'stale-build-reloaded'

/**
 * A tab opened before a deploy asks for a screen's file by a name the new build no longer has
 * (Vite names every file by its content). Reloading fetches the new build, so the user gets the
 * screen instead of an error. Once per tab: a file that is really missing must not loop, and a
 * browser that cannot remember it reloaded (no session storage) is left with the error. Returns the
 * function that stops listening.
 */
export function reloadOnStaleBuild(target: Window, reload: () => void): () => void {
  const onError = (event: Event) => {
    try {
      if (target.sessionStorage.getItem(RELOADED) !== null) return
      target.sessionStorage.setItem(RELOADED, '1')
    } catch {
      return
    }
    event.preventDefault()
    reload()
  }
  target.addEventListener('vite:preloadError', onError)
  return () => target.removeEventListener('vite:preloadError', onError)
}
