import { TextField, type TextFieldRootOptions } from '@kobalte/core/text-field'
import { type ComponentProps, Show, splitProps } from 'solid-js'
import { inputClass } from '#input'
import { cn } from '#libs'

/** What Kobalte manages through the field's root: the value and the state the input and its parts share. */
type RootProps = Pick<TextFieldRootOptions, 'value' | 'onChange' | 'name' | 'required' | 'disabled' | 'readOnly'>

export type FieldProps = Omit<ComponentProps<'input'>, 'onInput' | keyof TextFieldRootOptions> &
  RootProps & {
    /** What the field asks for; it names the input. */
    label: string
    /** A hint under the input, read out with it. */
    description?: string | undefined
    /** Marks the field invalid and shows this message, read out with the input. */
    error?: string | undefined
  }

/**
 * A labelled text input with an optional hint and error, wired for screen readers by Kobalte's
 * `TextField`. A passed `class` goes on the wrapper, for layout; the other attributes go on the input.
 */
export function Field(props: FieldProps) {
  const [local, root, input] = splitProps(
    props,
    ['class', 'label', 'description', 'error'],
    ['value', 'onChange', 'name', 'required', 'disabled', 'readOnly']
  )

  return (
    <TextField
      {...root}
      validationState={local.error ? 'invalid' : 'valid'}
      class={cn('flex flex-col gap-1.5', local.class)}
    >
      <TextField.Label class="text-sm font-medium">{local.label}</TextField.Label>
      <TextField.Input class={inputClass} {...input} />
      {/* An error takes the hint's place: the two would often say the same thing. */}
      <Show when={local.description && !local.error}>
        <TextField.Description class="text-sm text-muted-foreground">{local.description}</TextField.Description>
      </Show>
      <TextField.ErrorMessage class="text-sm text-destructive">{local.error}</TextField.ErrorMessage>
    </TextField>
  )
}
