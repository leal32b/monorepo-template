import { createSignal, onCleanup } from 'solid-js'

/**
 * A wait that counts down in whole seconds, for a button that must not be pressed again at once, such
 * as sending an email again (the API limits it, and a second email before the first arrives helps
 * no one). `start()` begins it, or begins it again; `remaining()` is the seconds left, 0 when over.
 */
export function createCooldown(seconds: number) {
  const [remaining, setRemaining] = createSignal(0)
  let timer: ReturnType<typeof setInterval> | undefined

  const stop = () => {
    clearInterval(timer)
    timer = undefined
  }

  const start = () => {
    stop()
    setRemaining(seconds)
    timer = setInterval(() => {
      setRemaining((left) => left - 1)
      if (remaining() === 0) stop()
    }, 1000)
  }

  onCleanup(stop)

  return { remaining, start }
}
