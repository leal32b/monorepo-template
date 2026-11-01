import { type ComponentProps, For, splitProps } from 'solid-js'
import { Icon } from '#icon'
import { inputWithActionClass } from '#input'
import { cn } from '#libs'

export type SelectOption = {
  value: string
  label: string
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

  return (
    <div class={cn('relative w-full sm:w-auto', local.class)}>
      <select
        class={cn(inputWithActionClass, 'cursor-pointer appearance-none')}
        onChange={(event) => local.onChange(event.currentTarget.value)}
        {...rest}
      >
        {/* The current option is marked on the option: a `value` on the select lands before its options exist. */}
        <For each={local.options}>
          {(option) => (
            <option value={option.value} selected={option.value === local.value}>
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
