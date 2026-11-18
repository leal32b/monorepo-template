import type { Billing, CheckoutKind, PlanKey } from '@repo/contracts'
import { type Accessor, createEffect, createSignal, onCleanup } from 'solid-js'

/** How the owner came back from the provider's page (ADR 0067): `?checkout=returned` or `?checkout=cancelled`. */
export type Came = 'returned' | 'cancelled' | undefined

/**
 * What the plan page says of the way back: waiting for the provider's confirmation, the plan it confirmed,
 * an open payment that went away unpaid, a confirmation still to come after a minute, or a page left with
 * nothing paid. `checkout` is the payment waited for; `plan` the plan paid for when it was read.
 */
export type Arrival =
  | { kind: 'waiting' | 'late' | 'notPaid'; checkout: { kind: CheckoutKind; plan: PlanKey }; plan: PlanKey | null }
  | { kind: 'confirmed'; plan: PlanKey }
  | { kind: 'cancelled' }

/** How often the page reads the plan while it waits, and for how long (ADR 0063). */
export const waitEveryMs = 3000
export const waitForMs = 60_000

/**
 * The way back from the provider (ADR 0063): once returned, while a payment is open, the plan is read
 * again every 3 seconds for up to a minute, until the provider's notice clears it; the membership the
 * frame draws from is read once it did. The billing read is asked rather than the membership, since it is
 * what the page draws (ADR 0068). A payment confirmed before the page was read is said at once.
 */
export function createArrival(
  came: Came,
  billing: Accessor<Billing | undefined>,
  { readAgain, confirmed }: { readAgain: () => void; confirmed: () => void }
): { arrival: Accessor<Arrival | undefined>; forget: () => void } {
  const [arrival, setArrival] = createSignal<Arrival | undefined>(
    came === 'cancelled' ? { kind: 'cancelled' } : undefined
  )
  /** The owner did something else: what they did is said instead, and the wait ends. */
  const forget = () => {
    stop()
    setArrival(undefined)
  }

  let every: ReturnType<typeof setInterval> | undefined
  let until: ReturnType<typeof setTimeout> | undefined
  function stop() {
    clearInterval(every)
    clearTimeout(until)
  }
  if (came !== 'returned') return { arrival, forget }
  onCleanup(stop)
  let started = false

  createEffect(() => {
    const read = billing()
    if (read === undefined) return
    const { checkout, plan } = read.subscription
    const said = arrival()
    if (!started) {
      started = true
      if (checkout === null) {
        if (plan !== null) setArrival({ kind: 'confirmed', plan })
        return
      }
      const waiting = { kind: 'waiting', checkout: { kind: checkout.kind, plan: checkout.plan }, plan } as const
      setArrival(waiting)
      every = setInterval(readAgain, waitEveryMs)
      // Cleared once the wait ends otherwise, so it fires only while still waiting.
      until = setTimeout(() => {
        stop()
        setArrival({ ...waiting, kind: 'late' })
      }, waitForMs)
      return
    }
    if (checkout !== null || said === undefined || (said.kind !== 'waiting' && said.kind !== 'late')) return
    stop()
    setArrival(plan === said.checkout.plan ? { kind: 'confirmed', plan } : { ...said, kind: 'notPaid', plan })
    confirmed()
  })

  return { arrival, forget }
}
