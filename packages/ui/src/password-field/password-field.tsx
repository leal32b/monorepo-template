import { TextField, type TextFieldRootOptions } from '@kobalte/core/text-field'
import { type ComponentProps, createSignal, Show, splitProps } from 'solid-js'
import { Button } from '#button'
import { inputClass } from '#input'
import { cn } from '#libs'

/** What Kobalte manages through the field's root: the value and the state the input and its parts share. */
type RootProps = Pick<TextFieldRootOptions, 'value' | 'onChange' | 'name' | 'required' | 'disabled' | 'readOnly'>

export type PasswordFieldProps = Omit<ComponentProps<'input'>, 'type' | 'onInput' | keyof TextFieldRootOptions> &
  RootProps & {
    /** What the field asks for; it names the input. */
    label: string
    /** Names the show-and-hide button, such as "Show password"; `aria-pressed` tells whether it is shown. */
    toggleLabel: string
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
    ['class', 'label', 'toggleLabel', 'description', 'error'],
    ['value', 'onChange', 'name', 'required', 'disabled', 'readOnly']
  )
  const [shown, setShown] = createSignal(false)

  return (
    <TextField
      {...root}
      validationState={local.error ? 'invalid' : 'valid'}
      class={cn('flex flex-col gap-1.5', local.class)}
    >
      <TextField.Label class="text-sm font-medium">{local.label}</TextField.Label>
      <div class="relative">
        <TextField.Input class={cn(inputClass, 'pr-11 sm:pr-9')} type={shown() ? 'text' : 'password'} {...input} />
        <Button
          variant="ghost"
          aria-label={local.toggleLabel}
          aria-pressed={shown()}
          disabled={root.disabled}
          onClick={() => setShown(!shown())}
          class="group absolute inset-y-0 right-0 h-11 w-11 px-0 text-muted-foreground hover:bg-transparent sm:h-9 sm:w-9"
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
