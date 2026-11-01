import { TextField, type TextFieldRootOptions } from '@kobalte/core/text-field'
import { type ComponentProps, createSignal, type JSX, Show, splitProps } from 'solid-js'
import { Button } from '#button'
import { inputWithActionClass } from '#input'
import { cn } from '#libs'

/** What Kobalte manages through the field's root: the value and the state the input and its parts share. */
type RootProps = Pick<TextFieldRootOptions, 'value' | 'onChange' | 'name' | 'required' | 'disabled' | 'readOnly'>

export type PasswordFieldProps = Omit<ComponentProps<'input'>, 'type' | 'onInput' | keyof TextFieldRootOptions> &
  RootProps & {
    /** What the field asks for; it names the input. */
    label: string
    /** Names the show-and-hide button, such as "Show password"; `aria-pressed` tells whether it is shown. */
    toggleLabel: string
    /** Something to offer beside the label, on its right, such as the way to a forgotten password. */
    labelAction?: JSX.Element
    /** A hint under the input, read out with it. */
    description?: string | undefined
    /** Marks the field invalid and shows this message, read out with the input. */
    error?: string | undefined
  }

const icon = { width: 20, height: 20, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': 2 }

/**
 * A labelled password input with a button that shows what was typed, so a typo is caught before it
 * is sent, without a second "confirm" field. Wired like `Field`: label, hint and error are read out
 * with the input; a passed `class` goes on the wrapper, the other attributes on the input.
 */
export function PasswordField(props: PasswordFieldProps) {
  const [local, root, input] = splitProps(
    props,
    ['class', 'label', 'labelAction', 'toggleLabel', 'description', 'error'],
    ['value', 'onChange', 'name', 'required', 'disabled', 'readOnly']
  )
  const [shown, setShown] = createSignal(false)

  return (
    <TextField
      {...root}
      validationState={local.error ? 'invalid' : 'valid'}
      class={cn('flex flex-col gap-1.5', local.class)}
    >
      <div class="flex items-baseline justify-between gap-4">
        <TextField.Label class="text-sm font-medium">{local.label}</TextField.Label>
        {local.labelAction}
      </div>
      <div class="relative">
        <TextField.Input class={inputWithActionClass} type={shown() ? 'text' : 'password'} {...input} />
        <Button
          variant="bare"
          size="icon"
          aria-label={local.toggleLabel}
          aria-pressed={shown()}
          disabled={root.disabled}
          onClick={() => setShown(!shown())}
          class="group absolute inset-y-0 right-0 text-muted-foreground"
        >
          {/* The whole button takes the press; the hover lights a chip inside the input's border. */}
          <span class="flex size-8 items-center justify-center rounded-md transition-colors group-hover:bg-secondary sm:size-7">
            <svg {...icon} aria-hidden="true">
              <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z" />
              <circle cx="12" cy="12" r="3" />
              <Show when={shown()}>
                <path d="M3 3l18 18" />
              </Show>
            </svg>
          </span>
        </Button>
      </div>
      {/* An error takes the hint's place: the two would often say the same thing. */}
      <Show when={local.description && !local.error}>
        <TextField.Description class="text-sm text-muted-foreground">{local.description}</TextField.Description>
      </Show>
      <TextField.ErrorMessage class="text-sm text-destructive">{local.error}</TextField.ErrorMessage>
    </TextField>
  )
}
