import { Avatar, cn, hasDuotone, Icon, type IconName, Menu, MenuItem } from '@repo/ui'
import { useNavigate } from '@solidjs/router'
import { For, type JSX, Show } from 'solid-js'
import { useSession } from '#entities/sessions'
import { useI18n } from '#shared/config'
import { samePath } from '../model/marked-path'
import { tabsOf } from '../model/product-screens'

/** A product screen as a tab draws it: its address, its name in the user's language, its icon. */
export type Tab = { href: string; label: string; icon: IconName }

export type TabBarProps = {
  /** The product's screens, in the side menu's order. */
  screens: Tab[]
  /** The path the bar marks as current, as the side menu marks it. */
  path: () => string
  /** Opens the command palette. */
  onSearch: () => void
}

const tabClass =
  'flex h-full w-full flex-col items-center justify-center gap-1 rounded-md text-xs text-muted-foreground transition-colors hover:text-foreground aria-[current=page]:font-medium aria-[current=page]:text-foreground'

/** An icon that turns duotone where its tab is the current one, as the side menu's do. */
function TabIcon(props: { name: IconName; current: boolean }) {
  const duotone = () => {
    const name = props.name
    return props.current && hasDuotone(name) ? name : undefined
  }
  return (
    <Show when={duotone()} fallback={<Icon name={props.name} class="text-xl" />}>
      {(name) => <Icon name={name()} weight="duotone" class="text-xl" />}
    </Show>
  )
}

function TabLink(props: { href: string; current: boolean; children: JSX.Element }) {
  return (
    <a href={props.href} aria-current={props.current ? 'page' : undefined} class={tabClass}>
      {props.children}
    </a>
  )
}

/**
 * The tab bar of phones (ADR 0080), fixed at the bottom above the safe area: up to three of the product's
 * screens (past three, two and "Modules" with the rest), then Search, which opens the palette, and You, the
 * person's screen, by their round avatar. Below `md` only: wider screens have the side menu.
 */
export function TabBar(props: TabBarProps) {
  const { t } = useI18n()
  const user = useSession()
  const navigate = useNavigate()
  const split = () => tabsOf(props.screens)
  const here = (href: string) => samePath(props.path(), href)
  const inMore = () => split().more.some((screen) => here(screen.href))
  const onYou = () => /^\/settings(\/|$)/.test(props.path())

  return (
    <nav
      aria-label={t('appShell.nav.main')}
      class="fixed inset-x-0 bottom-0 z-30 border-t border-border-subtle bg-background pb-[env(safe-area-inset-bottom)] md:hidden"
    >
      <ul class="m-0 grid h-16 list-none grid-flow-col auto-cols-fr gap-1 px-2 py-1">
        <For each={split().tabs}>
          {(screen) => (
            <li>
              <TabLink href={screen.href} current={here(screen.href)}>
                <TabIcon name={screen.icon} current={here(screen.href)} />
                {screen.label}
              </TabLink>
            </li>
          )}
        </For>
        <Show when={split().more.length > 0}>
          <li>
            <Menu
              placement="top"
              // The trigger is a button, which `aria-current` does not mark: the look says it.
              triggerClass={cn(tabClass, inMore() && 'font-medium text-foreground')}
              trigger={
                <>
                  <TabIcon name="modules" current={inMore()} />
                  {t('appShell.nav.modules')}
                </>
              }
            >
              <For each={split().more}>
                {(screen) => (
                  <MenuItem icon={screen.icon} onSelect={() => navigate(screen.href)}>
                    {screen.label}
                  </MenuItem>
                )}
              </For>
            </Menu>
          </li>
        </Show>
        <li>
          <button type="button" class={tabClass} aria-keyshortcuts="Control+K Meta+K" onClick={props.onSearch}>
            <Icon name="search" class="text-xl" />
            {t('appShell.search')}
          </button>
        </li>
        <li>
          <TabLink href="/settings" current={onYou()}>
            <Avatar name={user.name} size="xs" />
            {t('appShell.nav.you')}
          </TabLink>
        </li>
      </ul>
    </nav>
  )
}
