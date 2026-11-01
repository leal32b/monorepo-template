import { type ComponentProps, For, Show, splitProps } from 'solid-js'
import { Icon } from '#icon'
import { cn } from '#libs'

export type StepperProps = Omit<ComponentProps<'ol'>, 'children'> & {
  /** The steps' names, in order. */
  steps: string[]
  /** Which step the user is on, counting from 0. Earlier ones are done. */
  current: number
  /** Said after a finished step's name to screen readers, such as "done". */
  doneLabel: string
}

/**
 * The steps of a flow and where the user is: done, current, to come. The current step is
 * `aria-current="step"` and the done ones say so in text, since the look alone (a check, a colour)
 * is not enough. Layout is left to the flow: the steps wrap on narrow screens.
 */
export function Stepper(props: StepperProps) {
  const [local, rest] = splitProps(props, ['class', 'steps', 'current', 'doneLabel'])

  return (
    <ol class={cn('m-0 flex list-none flex-wrap gap-x-5 gap-y-2 p-0 text-sm', local.class)} {...rest}>
      <For each={local.steps}>
        {(step, index) => {
          const done = () => index() < local.current
          const current = () => index() === local.current
          return (
            <li
              aria-current={current() ? 'step' : undefined}
              class={cn('flex items-center gap-2', current() ? 'font-medium text-foreground' : 'text-muted-foreground')}
            >
              <span
                aria-hidden="true"
                class={cn(
                  'flex size-6 items-center justify-center rounded-full border text-xs font-semibold',
                  current() && 'border-primary bg-primary text-primary-foreground',
                  done() && 'border-success text-success',
                  !(current() || done()) && 'border-border-subtle bg-background'
                )}
              >
                {done() ? <Icon name="check" class="size-3.5" /> : index() + 1}
              </span>
              {step}
              <Show when={done()}>
                <span class="sr-only">{local.doneLabel}</span>
              </Show>
            </li>
          )
        }}
      </For>
    </ol>
  )
}
