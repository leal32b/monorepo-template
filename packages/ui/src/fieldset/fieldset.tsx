import { createUniqueId, type JSX, Show } from 'solid-js'
import { cn } from '#libs'

export type FieldsetProps = {
  /** What the group asks for, as a field's label would. */
  label: string
  /** A hint under the group, read out with it. */
  description?: string | undefined
  /** What is wrong with the group as a whole ("Choose at least one"), in a field error's place and look. */
  error?: string | undefined
  class?: string | undefined
  children: JSX.Element
}

/**
 * A field made of several controls (a grid of `CheckboxGroup`s): its label, the controls, then its hint
 * or its error, in the places and looks of a `Field`'s. The error is announced when it appears.
 */
export function Fieldset(props: FieldsetProps) {
  const hint = createUniqueId()

  return (
    <fieldset
      aria-describedby={hint}
      aria-invalid={props.error ? true : undefined}
      class={cn('m-0 flex min-w-0 flex-col gap-1.5 border-0 p-0', props.class)}
    >
      <legend class="mb-1.5 p-0 text-sm font-medium">{props.label}</legend>
      {props.children}
      <Show
        when={props.error}
        fallback={
          <Show when={props.description}>
            <p id={hint} class="text-sm text-muted-foreground">
              {props.description}
            </p>
          </Show>
        }
      >
        <p id={hint} role="alert" class="text-sm text-destructive">
          {props.error}
        </p>
      </Show>
    </fieldset>
  )
}
