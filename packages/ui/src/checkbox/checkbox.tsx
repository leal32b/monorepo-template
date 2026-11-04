import { type CheckboxRootOptions, Checkbox as Kobalte } from '@kobalte/core/checkbox'
import { Show, splitProps } from 'solid-js'
import { Icon } from '#icon'
import { cn } from '#libs'

export type CheckboxProps = Pick<CheckboxRootOptions, 'disabled' | 'name'> & {
  /** What it switches on; it names the checkbox. */
  label: string
  /** A line under the label, read out with it: why it is disabled, or what it does. */
  description?: string | undefined
  checked: boolean
  onChange: (checked: boolean) => void
  class?: string | undefined
}

/**
 * One yes or no among several that can be set together (the permissions of a role). Kobalte brings the
 * keyboard (Space toggles) and the wiring of label and description for screen readers. The mark inside
 * the box says "on" as well as the colour does, and the whole row is the touch target.
 */
export function Checkbox(props: CheckboxProps) {
  const [local, root] = splitProps(props, ['class', 'label', 'description'])

  return (
    <Kobalte
      {...root}
      class={cn(
        'has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-ring flex min-h-11 items-start gap-2.5 rounded-md py-2.5 sm:min-h-0 sm:py-1.5',
        local.class
      )}
    >
      <Kobalte.Input />
      <Kobalte.Control class="mt-0.5 flex size-5 shrink-0 cursor-pointer items-center justify-center rounded-sm border border-border bg-background text-primary-foreground transition-colors data-[checked]:border-primary data-[checked]:bg-primary data-[disabled]:cursor-not-allowed data-[disabled]:opacity-50">
        <Kobalte.Indicator>
          <Icon name="check" />
        </Kobalte.Indicator>
      </Kobalte.Control>
      <div class="flex min-w-0 flex-col">
        <Kobalte.Label class="cursor-pointer select-none text-base data-[disabled]:cursor-not-allowed data-[disabled]:text-muted-foreground sm:text-sm">
          {local.label}
        </Kobalte.Label>
        <Show when={local.description}>
          <Kobalte.Description class="text-sm text-muted-foreground">{local.description}</Kobalte.Description>
        </Show>
      </div>
    </Kobalte>
  )
}
