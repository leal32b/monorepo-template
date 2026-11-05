import type { JSX } from 'solid-js'
import { Icon } from '#icon'

/**
 * The look of a menu's trigger that shows who or what is current (the organization, the account): a
 * row as tall as a touch target, the width of its place. Pass it as a `Menu`'s `triggerClass`.
 */
export const menuTriggerClass =
  'flex h-11 w-full min-w-0 cursor-pointer items-center gap-2 rounded-md px-2 text-left transition-colors hover:bg-secondary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring'

/** What such a trigger holds: the `Avatar`, the name, cut short when long, and the mark of a menu. */
export function MenuTriggerContent(props: { avatar: JSX.Element; label: string }) {
  return (
    <>
      {props.avatar}
      <span class="min-w-0 flex-1 truncate text-base font-medium sm:text-sm">{props.label}</span>
      <Icon name="expand" class="text-muted-foreground" />
    </>
  )
}
