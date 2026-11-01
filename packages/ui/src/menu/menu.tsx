import { DropdownMenu } from '@kobalte/core/dropdown-menu'
import { type ComponentProps, type JSX, Show, splitProps } from 'solid-js'
import { Icon, type IconName } from '#icon'
import { cn } from '#libs'

export type MenuProps = {
  /** What the trigger button holds: an avatar and a name, or an icon with a `label`. */
  trigger: JSX.Element
  /** The trigger's look: pass `buttonVariants(...)` or classes of your own. */
  triggerClass?: string | undefined
  /** Names the trigger when it holds only an icon. */
  triggerLabel?: string | undefined
  /** Where the list opens, from the trigger. */
  placement?: NonNullable<ComponentProps<typeof DropdownMenu>['placement']>
  /** `MenuItem`s, `MenuSeparator`s and `MenuHeader`. */
  children: JSX.Element
}

/**
 * A list of actions that opens from a button (the account menu). Kobalte brings the keyboard path:
 * Enter, Space or the arrows open it, the arrows and typing move through it, Escape closes it and
 * hands focus back to the trigger.
 */
export function Menu(props: MenuProps) {
  const [local, root] = splitProps(props, ['trigger', 'triggerClass', 'triggerLabel', 'children'])

  return (
    <DropdownMenu {...root}>
      <DropdownMenu.Trigger class={local.triggerClass} aria-label={local.triggerLabel}>
        {local.trigger}
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content class="z-50 min-w-56 rounded-md border border-border-subtle bg-background p-1.5 text-base outline-none sm:text-sm">
          {local.children}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu>
  )
}

export type MenuItemProps = {
  icon?: IconName | undefined
  /** Runs when the item is chosen with the mouse, touch or keyboard. */
  onSelect: () => void
  class?: string | undefined
  children: JSX.Element
}

/** One action in a `Menu`. */
export function MenuItem(props: MenuItemProps) {
  return (
    <DropdownMenu.Item
      onSelect={props.onSelect}
      class={cn(
        'flex h-11 cursor-pointer select-none items-center gap-2.5 rounded-sm px-2 outline-none data-[highlighted]:bg-secondary sm:h-9',
        props.class
      )}
    >
      <Show when={props.icon}>{(name) => <Icon name={name()} class="text-muted-foreground" />}</Show>
      {props.children}
    </DropdownMenu.Item>
  )
}

/** A line between groups of items. */
export function MenuSeparator() {
  return <DropdownMenu.Separator class="-mx-1.5 my-1.5 border-t border-border-subtle" />
}

/** Text at the top of a menu, such as who is signed in. It is not an action. */
export function MenuHeader(props: { children: JSX.Element }) {
  return <div class="flex flex-col px-2 pt-1.5 pb-2 text-sm leading-snug">{props.children}</div>
}
