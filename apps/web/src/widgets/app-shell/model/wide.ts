import { type Accessor, createSignal, onCleanup } from 'solid-js'

/** The width from which the frame draws its side menu rather than the tab bar: UnoCSS's `md`. */
export const wideQuery = '(min-width: 768px)'

/**
 * Whether the screen is as wide as the side menu needs (ADR 0080), following the window as it changes: what
 * the frame decides in code, such as where `/settings` leads; what it only draws follows `md:` in its classes.
 */
export function createWide(): Accessor<boolean> {
  const media = window.matchMedia(wideQuery)
  const [wide, setWide] = createSignal(media.matches)
  const follow = (event: MediaQueryListEvent) => setWide(event.matches)
  media.addEventListener('change', follow)
  onCleanup(() => media.removeEventListener('change', follow))
  return wide
}
