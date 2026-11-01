import { SegmentedControl as Kobalte } from '@kobalte/core/segmented-control'
import { For, Show, splitProps } from 'solid-js'
import { Icon, type IconName } from '#icon'
import { cn } from '#libs'

export type SegmentedControlOption = {
  value: string
  label: string
  icon?: IconName | undefined
}

export type SegmentedControlProps = {
  /** Names the group for screen readers, such as "Theme". */
  label: string
  options: SegmentedControlOption[]
  value: string
  onChange: (value: string) => void
  class?: string | undefined
}

/**
 * One choice among a few short ones, all in view (a theme). Radio buttons underneath, so the arrow
 * keys move the choice. The selected item is outlined, not shadowed, and says so in text as well as
 * in its look.
 */
export function SegmentedControl(props: SegmentedControlProps) {
  const [local, root] = splitProps(props, ['class', 'label', 'options'])

  return (
    <Kobalte {...root} class={cn('inline-flex w-fit flex-col gap-1', local.class)}>
      <Kobalte.Label class="sr-only">{local.label}</Kobalte.Label>
      <div role="presentation" class="inline-flex gap-0.5 rounded-md border border-border-subtle bg-surface p-0.5">
        <For each={local.options}>
          {(option) => (
            <Kobalte.Item
              value={option.value}
              class="has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-ring rounded-md"
            >
              <Kobalte.ItemInput />
              <Kobalte.ItemLabel class="flex h-11 cursor-pointer select-none items-center gap-1.5 rounded-md border border-transparent px-3 text-base text-muted-foreground transition-colors data-[checked]:border-border data-[checked]:bg-background data-[checked]:font-medium data-[checked]:text-foreground sm:h-8 sm:text-sm">
                <Show when={option.icon}>{(name) => <Icon name={name()} />}</Show>
                {option.label}
              </Kobalte.ItemLabel>
            </Kobalte.Item>
          )}
        </For>
      </div>
    </Kobalte>
  )
}
