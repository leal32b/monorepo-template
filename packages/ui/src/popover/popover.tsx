import { Popover as Kobalte } from '@kobalte/core/popover'
import { type ComponentProps, type JSX, splitProps } from 'solid-js'

export type PopoverProps = {
  /** What the trigger button holds. */
  trigger: JSX.Element
  /** The trigger's look: pass `buttonVariants(...)` or classes of your own. */
  triggerClass?: string | undefined
  /** Names the trigger when it holds only an icon. */
  triggerLabel?: string | undefined
  /** Heads the popover and names it for screen readers. */
  title: string
  /** Names the close button, such as "Close". */
  closeLabel: string
  placement?: NonNullable<ComponentProps<typeof Kobalte>['placement']>
  children: JSX.Element
}

/**
 * A small panel that opens from a button and holds information or a few controls (the service
 * status). It is not a menu of actions: use `Menu` for that. Focus moves into it when it opens, Escape
 * or a click outside closes it, and focus returns to the trigger.
 */
export function Popover(props: PopoverProps) {
  const [local, root] = splitProps(props, [
    'trigger',
    'triggerClass',
    'triggerLabel',
    'title',
    'closeLabel',
    'children'
  ])

  return (
    <Kobalte {...root}>
      <Kobalte.Trigger class={local.triggerClass} aria-label={local.triggerLabel}>
        {local.trigger}
      </Kobalte.Trigger>
      <Kobalte.Portal>
        <Kobalte.Content class="z-50 flex w-72 max-w-[calc(100vw-2rem)] flex-col gap-3 rounded-md border border-border-subtle bg-background p-4 text-base outline-none sm:text-sm">
          <Kobalte.Title class="font-semibold">{local.title}</Kobalte.Title>
          {local.children}
          <Kobalte.CloseButton
            aria-label={local.closeLabel}
            class="sr-only focus-visible:not-sr-only focus-visible:underline"
          >
            {local.closeLabel}
          </Kobalte.CloseButton>
        </Kobalte.Content>
      </Kobalte.Portal>
    </Kobalte>
  )
}
