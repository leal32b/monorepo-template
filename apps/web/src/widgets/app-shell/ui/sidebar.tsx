import { cn, Icon, type IconName } from '@repo/ui'
import { A, useMatch } from '@solidjs/router'
import { createUniqueId, For, type JSX, Show } from 'solid-js'
import { useI18n } from '#shared/config'
import type { ServiceStatus } from '../model/service-status'
import { ServiceProblem, ServiceStatusButton } from './service-status'
import { UserMenu } from './user-menu'

export type SidebarProps = {
  status: ServiceStatus
  signOut: () => void
  /** Called after a link is followed, so the phone drawer can close. */
  onNavigate?: (() => void) | undefined
  class?: string | undefined
}

type Item<Label extends string> = { href: string; label: Label; icon: IconName }

/** The product's own screens. Settings has its own menu, reached from the account. */
const items: Item<'home'>[] = [{ href: '/', label: 'home', icon: 'home' }]

/** The settings of the user's own account; the organization's join them in 6.5. */
const accountItems: Item<'profile' | 'security' | 'preferences'>[] = [
  { href: '/settings/profile', label: 'profile', icon: 'profile' },
  { href: '/settings/security', label: 'security', icon: 'security' },
  { href: '/settings/preferences', label: 'preferences', icon: 'monitor' }
]

const linkClass =
  'flex h-11 items-center gap-2.5 rounded-md px-2 text-base text-muted-foreground transition-colors hover:bg-secondary aria-[current=page]:bg-secondary aria-[current=page]:font-medium aria-[current=page]:text-foreground sm:h-9 sm:text-sm'

function NavLink(props: {
  href: string
  icon: IconName
  onNavigate?: (() => void) | undefined
  children: JSX.Element
}) {
  return (
    <A href={props.href} end onClick={props.onNavigate} class={linkClass}>
      <Icon name={props.icon} />
      {props.children}
    </A>
  )
}

/**
 * The side menu: the brand at the top, the product's screens, and at the foot the account with the
 * service status. In the settings, the screens give way to the way back and the settings' own list.
 * A problem with the service is said in a line above the account; when all is well only the icon stays.
 */
export function Sidebar(props: SidebarProps) {
  const { t } = useI18n()
  const inSettings = useMatch(() => '/settings/*')
  const accountLabel = createUniqueId()

  return (
    <div class={cn('flex h-full flex-col gap-4 bg-surface p-3', props.class)}>
      <A href="/" onClick={props.onNavigate} class="flex h-11 items-center px-2 font-semibold tracking-tight">
        {t('app.name')}
      </A>
      <Show
        when={inSettings()}
        fallback={
          <nav aria-label={t('appShell.nav.main')} class="flex-1">
            <ul class="m-0 flex list-none flex-col gap-1 p-0">
              <For each={items}>
                {(item) => (
                  <li>
                    <NavLink href={item.href} icon={item.icon} onNavigate={props.onNavigate}>
                      {t(`appShell.nav.${item.label}`)}
                    </NavLink>
                  </li>
                )}
              </For>
            </ul>
          </nav>
        }
      >
        <nav aria-label={t('appShell.nav.settings')} class="flex flex-1 flex-col gap-4">
          <NavLink href="/" icon="back" onNavigate={props.onNavigate}>
            {t('appShell.nav.back')}
          </NavLink>
          <div class="flex flex-col gap-1">
            <p id={accountLabel} class="m-0 px-2 text-sm font-medium text-muted-foreground">
              {t('appShell.nav.account')}
            </p>
            <ul aria-labelledby={accountLabel} class="m-0 flex list-none flex-col gap-1 p-0">
              <For each={accountItems}>
                {(item) => (
                  <li>
                    <NavLink href={item.href} icon={item.icon} onNavigate={props.onNavigate}>
                      {t(`appShell.nav.${item.label}`)}
                    </NavLink>
                  </li>
                )}
              </For>
            </ul>
          </div>
        </nav>
      </Show>
      <div class="flex flex-col gap-2 border-t border-border-subtle pt-3">
        <ServiceProblem status={props.status} />
        <div class="flex items-center gap-1">
          <UserMenu signOut={props.signOut} class="flex-1" />
          <ServiceStatusButton status={props.status} />
        </div>
      </div>
    </div>
  )
}
