import { cn, hasDuotone, Icon, type IconName } from '@repo/ui'
import { A } from '@solidjs/router'
import { createUniqueId, For, type JSX, Show } from 'solid-js'
import type { ServiceStatus } from '#entities/health'
import { homeOf, startingOrganization, useOptionalOrganizations } from '#entities/organizations'
import { useI18n } from '#shared/config'
import { useInSettings } from '../model/in-settings'
import { samePath } from '../model/marked-path'
import { useShellOrganization } from '../model/shell'
import { OrganizationSwitcher } from './organization-switcher'
import { ServiceProblem, ServiceStatusButton } from './service-status'
import { UserMenu } from './user-menu'

export type SidebarProps = {
  status: ServiceStatus
  /** The path the menu marks as current: the screen chosen while it is on its way (`createMarkedPath`). */
  path: () => string
  signOut: () => void
  /** Called after a link is followed, so the phone drawer can close. */
  onNavigate?: (() => void) | undefined
  /** Called as the account menu goes to the settings, so the phone drawer can stay open. */
  onSettings?: (() => void) | undefined
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

/** The settings of the organization, under its slug (ADR 0034). */
const organizationItems = (home: string): Item<'general' | 'members' | 'roles'>[] => [
  { href: `${home}/settings/general`, label: 'general', icon: 'organization' },
  { href: `${home}/settings/members`, label: 'members', icon: 'users' },
  { href: `${home}/settings/roles`, label: 'roles', icon: 'role' }
]

const linkClass =
  'flex h-11 items-center gap-2.5 rounded-md px-2 text-base text-muted-foreground transition-colors hover:bg-secondary aria-[current=page]:bg-secondary aria-[current=page]:font-medium aria-[current=page]:text-foreground sm:h-9 sm:text-sm'

/**
 * A screen in the menu, marked when it is the one the menu marks (`SidebarProps.path`). A plain link, which
 * the router follows as it does its own, since the router's own link marks only the screen already on view.
 */
function NavLink(props: {
  href: string
  icon: IconName
  path: () => string
  onNavigate?: (() => void) | undefined
  children: JSX.Element
}) {
  const current = () => samePath(props.path(), props.href)
  /** The current screen's icon in duotone, when it has one; the others are drawn in outline. */
  const duotone = () => {
    const name = props.icon
    return current() && hasDuotone(name) ? name : undefined
  }

  return (
    <a href={props.href} aria-current={current() ? 'page' : undefined} onClick={props.onNavigate} class={linkClass}>
      <Show when={duotone()} fallback={<Icon name={props.icon} />}>
        {(name) => <Icon name={name()} weight="duotone" />}
      </Show>
      {props.children}
    </a>
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
  const current = useShellOrganization()
  const home = () => homeOf(current())
  const organizations = useOptionalOrganizations()
  /**
   * The organization the settings' own part is about: the screen's, or, on an account screen, the one
   * `/` would open (the last one used here, else the first), once the list is read.
   */
  const settingsOrganization = () =>
    current() ?? (organizations?.list.state === 'ready' ? startingOrganization(organizations.list()) : undefined)

  return (
    <div class={cn('flex h-full flex-col gap-4 bg-surface p-3', props.class)}>
      {/* As tall as the top bar, so the two titles share one baseline; no line under it, to keep the menu clean. */}
      <div class="-mx-3 -mt-3 flex h-14 shrink-0 items-center px-3 font-semibold tracking-tight">
        <Show
          when={inSettings()}
          fallback={
            <Show
              when={current()}
              keyed
              fallback={
                <A href={home()} onClick={props.onNavigate} class="truncate px-2">
                  {t('app.name')}
                </A>
              }
            >
              {(organization) => <OrganizationSwitcher organization={organization} onNavigate={props.onNavigate} />}
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
                    <NavLink href={item.href} icon={item.icon} path={props.path} onNavigate={props.onNavigate}>
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
          <NavLink href={home()} icon="back" path={props.path} onNavigate={props.onNavigate}>
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
                    <NavLink href={item.href} icon={item.icon} path={props.path} onNavigate={props.onNavigate}>
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
                        <NavLink href={item.href} icon={item.icon} path={props.path} onNavigate={props.onNavigate}>
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
          <UserMenu signOut={props.signOut} onSettings={props.onSettings} class="flex-1" />
          <ServiceStatusButton status={props.status} />
        </div>
      </div>
    </div>
  )
}
