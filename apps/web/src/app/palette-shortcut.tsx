import { onCleanup, onMount } from 'solid-js'
import { usePalette } from '#shared/config'

/**
 * ⌘K on a Mac, Ctrl+K elsewhere, opens the command palette, or closes it if it is open. It takes the key
 * from the browser, which would put it on its own search. It sits under the sign-in, so the shortcut
 * works only where the palette is drawn.
 */
export function PaletteShortcut() {
  const palette = usePalette()

  const onKeyDown = (event: KeyboardEvent) => {
    if ((event.metaKey || event.ctrlKey) && !event.altKey && event.key.toLowerCase() === 'k') {
      event.preventDefault()
      palette.toggle()
    }
  }

  onMount(() => window.addEventListener('keydown', onKeyDown))
  onCleanup(() => window.removeEventListener('keydown', onKeyDown))

  return null
}
