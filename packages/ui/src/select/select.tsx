import { type ComponentProps, createEffect, For, on, splitProps } from 'solid-js'
import { Icon } from '#icon'
import { inputWithActionClass } from '#input'
import { cn } from '#libs'

export type SelectOption = {
  value: string
  label: string
  /** Keeps the option in the list but not choosable; the screen says why. */
  disabled?: boolean | undefined
}

export type SelectProps = Omit<ComponentProps<'select'>, 'value' | 'onChange' | 'children'> & {
  options: SelectOption[]
  value: string
  onChange: (value: string) => void
}

/**
 * One choice from a list that can grow (a language, a time zone). The browser's own select, so a
 * phone opens its native picker and the keyboard works as everywhere; it looks like an input, with a
 * chevron. Name it with `aria-label` or a `<label for>`. For two to four short choices all in view,
 * use a `SegmentedControl`.
 */
export function Select(props: SelectProps) {
  const [local, rest] = splitProps(props, ['class', 'options', 'value', 'onChange'])
  let element: HTMLSelectElement | undefined
  // Once the options exist, so a disabled one before the chosen cannot leave the wrong one showing.
  createEffect(
    on([() => local.value, () => local.options], ([value]) => {
      ;(element as HTMLSelectElement).value = value
    })
  )

  return (
    <div class={cn('relative w-full sm:w-auto', local.class)}>
      <select
        ref={(select) => {
          element = select
        }}
        class={cn(inputWithActionClass, 'cursor-pointer appearance-none')}
        onChange={(event) => local.onChange(event.currentTarget.value)}
        {...rest}
      >
        {/* The current option is marked on the option: a `value` on the select lands before its options exist. */}
        <For each={local.options}>
          {(option) => (
            <option value={option.value} selected={option.value === local.value} disabled={option.disabled}>
              {option.label}
            </option>
          )}
        </For>
      </select>
      <Icon
        name="expand"
        class="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-muted-foreground sm:right-2.5"
      />
    </div>
  )
}
