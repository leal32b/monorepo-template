import { hasDuotone, Icon, type IconName } from '@repo/ui'
import { createUniqueId, For, type JSX, Show } from 'solid-js'
import { samePath } from '../model/marked-path'

/** A row of the frame's menus: a screen to go to, or the search. */
export const rowClass =
  'flex h-11 w-full items-center gap-2.5 rounded-md px-2 text-base text-muted-foreground transition-colors hover:bg-secondary aria-[current=page]:bg-secondary aria-[current=page]:font-medium aria-[current=page]:text-foreground sm:h-9 sm:text-sm'

/**
 * A screen in the menu, marked when it is the one the menu marks (`SidebarProps.path`). A plain link, which
 * the router follows as it does its own, since the router's own link marks only the screen already on view.
 */
export function NavLink(props: { href: string; icon: IconName; path: () => string; children: JSX.Element }) {
  const current = () => samePath(props.path(), props.href)
  /** The current screen's icon in duotone, when it has one; the others are drawn in outline. */
  const duotone = () => {
    const name = props.icon
    return current() && hasDuotone(name) ? name : undefined
  }

  return (
    <a href={props.href} aria-current={current() ? 'page' : undefined} class={rowClass}>
      <Show when={duotone()} fallback={<Icon name={props.icon} />}>
        {(name) => <Icon name={name()} weight="duotone" />}
      </Show>
      {props.children}
    </a>
  )
}

/** A group of settings, under its name when it has one: in the side menu, and as a phone's settings screen. */
export function SettingsGroup<Label extends string>(props: {
  label?: string | undefined
  items: { href: string; label: Label; icon: IconName }[]
  path: () => string
  name: (label: Label) => string
}) {
  const id = createUniqueId()
  return (
    <div class="flex flex-col gap-1">
      <Show when={props.label}>
        <p id={id} class="m-0 px-2 text-sm font-medium text-muted-foreground">
          {props.label}
        </p>
      </Show>
      <ul aria-labelledby={props.label ? id : undefined} class="m-0 flex list-none flex-col gap-1 p-0">
        <For each={props.items}>
          {(item) => (
            <li>
              <NavLink href={item.href} icon={item.icon} path={props.path}>
                {props.name(item.label)}
              </NavLink>
            </li>
          )}
        </For>
      </ul>
    </div>
  )
}
