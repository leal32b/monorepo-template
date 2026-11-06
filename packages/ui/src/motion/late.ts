import { type Accessor, createSignal, onCleanup, onMount } from 'solid-js'
import { motion } from './motion'

/** When the wait on screen began, and how many placeholders are up for it. */
let since: number | undefined
let up = 0

/**
 * Whether a placeholder (a skeleton) should show yet: once the wait it belongs to has lasted
 * `motion.waitDelay`, so a quick answer shows nothing. A wait is counted from its first placeholder and
 * goes on while one takes over from another, so a wait in stages (the session, then the organization,
 * then the screen) shows once and on time, instead of each stage starting the delay over (ADR 0038). It
 * ends once no placeholder is up.
 */
export function createLate(): Accessor<boolean> {
  const [late, setLate] = createSignal(false)
  onMount(() => {
    const now = Date.now()
    since ??= now
    up += 1
    const left = motion.waitDelay - (now - since)
    const timer = left > 0 ? setTimeout(() => setLate(true), left) : undefined
    if (timer === undefined) setLate(true)
    onCleanup(() => {
      clearTimeout(timer)
      up -= 1
      // A placeholder that takes over comes up in the same update, before this runs.
      queueMicrotask(() => {
        if (up === 0) since = undefined
      })
    })
  })
  return late
}
