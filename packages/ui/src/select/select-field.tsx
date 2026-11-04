import { createUniqueId, Show } from 'solid-js'
import { cn } from '#libs'
import { Select, type SelectOption } from './select'

export type SelectFieldProps = {
  /** What the field asks for; it names the select. */
  label: string
  options: SelectOption[]
  value: string
  onChange: (value: string) => void
  /** A hint under the select, read out with it: why some options cannot be chosen, say. */
  description?: string | undefined
  name?: string | undefined
  disabled?: boolean | undefined
  class?: string | undefined
}

/** A labelled `Select` with an optional hint, laid out as a `Field` is, to sit among them in a form. */
export function SelectField(props: SelectFieldProps) {
  const id = createUniqueId()
  const hint = createUniqueId()

  return (
    <div class={cn('flex flex-col gap-1.5', props.class)}>
      <label for={id} class="text-sm font-medium">
        {props.label}
      </label>
      <Select
        id={id}
        name={props.name}
        disabled={props.disabled}
        aria-describedby={props.description ? hint : undefined}
        class="sm:w-full"
        options={props.options}
        value={props.value}
        onChange={props.onChange}
      />
      <Show when={props.description}>
        <p id={hint} class="text-sm text-muted-foreground">
          {props.description}
        </p>
      </Show>
    </div>
  )
}
