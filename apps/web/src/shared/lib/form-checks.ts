import { createSignal } from 'solid-js'

/** What a form's rules say about what was typed: the clean values, or a problem per field. */
export type Checked<V, P> = { ok: true; values: V } | { ok: false; problems: P }

/**
 * How every form checks what was typed (the design-system skill): on submit, and again when a field
 * is left after that, never while typing. Not on the way to a button either: the press itself moves
 * focus, and errors coming or going above the button would move it from under the pointer, losing
 * the click. After a submit with problems, focus goes to the first field that has one.
 */
export function createFormChecks<V, P>(validate: () => Checked<V, P>) {
  const [problems, setProblems] = createSignal<Partial<P>>({})
  const [submitted, setSubmitted] = createSignal(false)

  const check = () => {
    const result = validate()
    setProblems(() => (result.ok ? {} : result.problems))
    return result
  }

  return {
    problems,
    recheck(event: FocusEvent) {
      if (submitted() && !(event.relatedTarget instanceof HTMLButtonElement)) check()
    },
    /** The values to send, or `undefined` after focusing the first field with a problem. */
    submit(form: HTMLFormElement): V | undefined {
      setSubmitted(true)
      const result = check()
      if (result.ok) return result.values
      form.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus()
      return undefined
    },
    /** Starts over, as before the first submit: for a form that stays on the screen after it worked. */
    reset() {
      setSubmitted(false)
      setProblems({})
    }
  }
}
