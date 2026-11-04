import { cn, hasDuotone, Icon, type IconName } from '@repo/ui'
import { A, useMatch } from '@solidjs/router'
import { createUniqueId, For, type JSX, Show } from 'solid-js'
import type { ServiceStatus } from '#entities/health'
import { homeOf, startingOrganization, useCurrentOrganization, useOptionalOrganizations } from '#entities/organizations'
import { useI18n } from '#shared/config'
import { useInSettings } from '../model/in-settings'
import { OrganizationSwitcher } from './organization-switcher'
import { ServiceProblem, ServiceStatusButton } from './service-status'
import { UserMenu } from './user-menu'

export type SidebarProps = {
  status: ServiceStatus
  signOut: () => void
  /** Called after a link is followed, so the phone drawer can close. */
  onNavigate?: (() => void) | undefined
  /** Whether this menu is the phone drawer, which stays open on the way to the settings. */
  inDrawer?: boolean | undefined
  class?: string | undefined
}

type Item<Label extends string> = { href: string; label: Label; icon: IconName }

/**
 * The product's own screens, under the organization's slug (ADR 0034). Settings has its own menu,
 * reached from the account.
 */
const itemsOf = (home: string): Item<'home'>[] => [{ href: home, label: 'home', icon: 'home' }]

/** The settings of the user's own account. */
const accountItems: Item<'profile' | 'security' | 'preferences'>[] = [
  { href: '/settings/profile', label: 'profile', icon: 'profile' },
  { href: '/settings/security', label: 'security', icon: 'security' },
  { href: '/settings/preferences', label: 'preferences', icon: 'monitor' }
]

/** The settings of the organization, under its slug (ADR 0034); Members and Roles join General. */
const organizationItems = (home: string): Item<'general'>[] => [
  { href: `${home}/settings/general`, label: 'general', icon: 'preferences' }
]

const linkClass =
  'flex h-11 items-center gap-2.5 rounded-md px-2 text-base text-muted-foreground transition-colors hover:bg-secondary aria-[current=page]:bg-secondary aria-[current=page]:font-medium aria-[current=page]:text-foreground sm:h-9 sm:text-sm'

function NavLink(props: {
  href: string
  icon: IconName
  onNavigate?: (() => void) | undefined
  children: JSX.Element
}) {
  const active = useMatch(() => props.href)
  /** The current screen's icon in duotone, when it has one; the others are drawn in outline. */
  const duotone = () => {
    const name = props.icon
    return active() && hasDuotone(name) ? name : undefined
  }

  return (
    <A href={props.href} end onClick={props.onNavigate} class={linkClass}>
      <Show when={duotone()} fallback={<Icon name={props.icon} />}>
        {(name) => <Icon name={name()} weight="duotone" />}
      </Show>
      {props.children}
    </A>
  )
}

/**
 * The side menu: at the top the organization you are in, with the way to change it (the brand on a screen
 * outside any), the product's screens, and at the foot the account with the
 * service status. In the settings, the screens give way to the way back and the settings' own list.
 * A problem with the service is said in a line above the account; when all is well only the icon stays.
 */
export function Sidebar(props: SidebarProps) {
  const { t } = useI18n()
  const inSettings = useInSettings()
  const accountLabel = createUniqueId()
  const organizationLabel = createUniqueId()
  /** The current organization's home; outside any (the account settings) the root picks one. */
  const current = useCurrentOrganization()
  const home = () => homeOf(current?.organization)
  const organizations = useOptionalOrganizations()
  /**
   * The organization the settings' own part is about: the screen's, or, on an account screen, the one
   * `/` would open (the last one used here, else the first), once the list is read.
   */
  const settingsOrganization = () =>
    current?.organization ??
    (organizations?.list.state === 'ready' ? startingOrganization(organizations.list()) : undefined)

  return (
    <div class={cn('flex h-full flex-col gap-4 bg-surface p-3', props.class)}>
      {/* As tall as the top bar, so the two titles share one baseline; no line under it, to keep the menu clean. */}
      <div class="-mx-3 -mt-3 flex h-14 shrink-0 items-center px-3 font-semibold tracking-tight">
        <Show
          when={inSettings()}
          fallback={
            <Show
              when={current}
              fallback={
                <A href={home()} onClick={props.onNavigate} class="truncate px-2">
                  {t('app.name')}
                </A>
              }
            >
              <OrganizationSwitcher onNavigate={props.onNavigate} />
            </Show>
          }
        >
          <span class="truncate px-2">{t('appShell.nav.settings')}</span>
        </Show>
      </div>
      <Show
        when={inSettings()}
        fallback={
          <nav aria-label={t('appShell.nav.main')} class="flex-1">
            <ul class="m-0 flex list-none flex-col gap-1 p-0">
              <For each={itemsOf(home())}>
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
          <NavLink href={home()} icon="back" onNavigate={props.onNavigate}>
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
          <Show when={settingsOrganization()}>
            {(organization) => (
              <div class="flex flex-col gap-1">
                <p id={organizationLabel} class="m-0 px-2 text-sm font-medium text-muted-foreground">
                  {t('appShell.nav.organization')}
                </p>
                <ul aria-labelledby={organizationLabel} class="m-0 flex list-none flex-col gap-1 p-0">
                  <For each={organizationItems(homeOf(organization()))}>
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
            )}
          </Show>
        </nav>
      </Show>
      <div class="flex flex-col gap-2 border-t border-border-subtle pt-3">
        <ServiceProblem status={props.status} />
        <div class="flex items-center gap-1">
          <UserMenu signOut={props.signOut} inDrawer={props.inDrawer} class="flex-1" />
          <ServiceStatusButton status={props.status} />
        </div>
      </div>
    </div>
  )
}
