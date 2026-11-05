import { createEffect, createSignal, on, onCleanup, Show } from 'solid-js'
import { cn } from '#libs'
import { motion } from '#motion'

export type ProgressBarProps = {
  /** Whether the server is working: true from the first request out to the last answer in. */
  active: boolean
  class?: string
}

/**
 * A thin stripe across the top of the window while the server works, with the screen already drawn
 * (ADR 0035). It shows only when the work takes longer than `motion.waitDelay`, so a quick answer
 * shows nothing, and once shown it stays `motion.progressMinimum` at least, so it never flashes. It
 * floats over the page and takes no room, so nothing moves when it comes or goes. It is decorative:
 * what the user is waiting for says so itself (a pending button, a skeleton, a status).
 */
export function ProgressBar(props: ProgressBarProps) {
  const [shown, setShown] = createSignal(false)
  let timer: ReturnType<typeof setTimeout> | undefined
  let since = 0

  createEffect(
    on(
      () => props.active,
      (active) => {
        clearTimeout(timer)
        if (active && !shown()) {
          timer = setTimeout(() => {
            since = Date.now()
            setShown(true)
          }, motion.waitDelay)
        } else if (!active && shown()) {
          timer = setTimeout(() => setShown(false), Math.max(0, motion.progressMinimum - (Date.now() - since)))
        }
      }
    )
  )
  onCleanup(() => clearTimeout(timer))

  return (
    <Show when={shown()}>
      <div
        aria-hidden="true"
        data-testid="progress-bar"
        class={cn('pointer-events-none fixed inset-x-0 top-0 z-50 h-0.5 overflow-hidden', props.class)}
      >
        <div class="ds-progress h-full w-full bg-primary" />
      </div>
    </Show>
  )
}
