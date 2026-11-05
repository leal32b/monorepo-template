import { useBeforeLeave, useIsRouting, useLocation } from '@solidjs/router'
import { createEffect, createSignal, on } from 'solid-js'

/**
 * The path the side menu marks as current. While a navigation waits, which only a screen's code not loaded
 * yet makes it do (ADR 0038), the screen on view stays but the menu marks the one chosen, so a click shows
 * at once that it landed; otherwise, the screen on view. A move through the browser's history names no
 * path before it is made, so it is marked once made.
 */
export function createMarkedPath(): () => string {
  const location = useLocation()
  const routing = useIsRouting()
  const [chosen, setChosen] = createSignal<string>()
  useBeforeLeave(({ to }) => setChosen(typeof to === 'string' ? to.split(/[?#]/, 1)[0] : undefined))
  createEffect(on(routing, (waiting) => waiting || setChosen(undefined), { defer: true }))
  return () => (routing() ? (chosen() ?? location.pathname) : location.pathname)
}

/** Whether two paths name the same screen, as the router compares them: case and a trailing slash aside. */
export const samePath = (one: string, other: string) =>
  one.replace(/\/+$/, '').toLowerCase() === other.replace(/\/+$/, '').toLowerCase()
