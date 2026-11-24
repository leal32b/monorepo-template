import { Icon } from '@repo/ui'
import { For, Show } from 'solid-js'
import { useImpersonation } from '#entities/impersonations'
import { homeOf, type Organization } from '#entities/organizations'
import { paletteShortcut, useI18n } from '#shared/config'
import { useInSettings } from '../model/in-settings'
import { type ProductScreen, screensOf } from '../model/product-screens'
import { accountSettings, organizationSettings, visitable } from '../model/settings-items'
import { NavLink, rowClass, SettingsGroup } from './nav-link'
import { OrganizationMenu } from './organization-menu'
import { PersonMenu } from './person-menu'

export type SidebarProps = {
  /** The organization at the top, whose screens the menu offers (`useFrameOrganization`). */
  organization: Organization | undefined
  /** The path the menu marks as current: the screen chosen while it is on its way (`createMarkedPath`). */
  path: () => string
  /** The product screen the settings go back to: the last one on view in this organization. */
  back: ProductScreen
  /** Opens the command palette, which ⌘K opens too. */
  onSearch: () => void
  signOut: () => void
}

/**
 * The side menu, from `md` (ADR 0080): at the top the organization's menu, then the search, the product's
 * screens, and at the foot the person's menu. In the settings the screens give way to the way back, named
 * after the screen it returns to, and the settings: the organization's first, then the person's.
 */
export function Sidebar(props: SidebarProps) {
  const { t } = useI18n()
  const inSettings = useInSettings()
  const impersonation = useImpersonation()
  /** The organization's settings an operator's visit can read (ADR 0077), every one otherwise. */
  const settingsOf = (organization: Organization) =>
    organizationSettings(homeOf(organization)).filter(
      (item) => impersonation.current()?.organization.id !== organization.id || visitable.has(item.label)
    )

  return (
    <div class="flex h-full flex-col gap-4 bg-surface p-3">
      <div class="-mx-3 -mt-3 flex h-14 shrink-0 items-center px-3">
        <OrganizationMenu organization={props.organization} />
      </div>
      <button type="button" class={rowClass} aria-keyshortcuts="Control+K Meta+K" onClick={props.onSearch}>
        <Icon name="search" />
        {t('appShell.search')}
        <kbd class="ml-auto font-sans text-xs">{paletteShortcut(navigator.platform)}</kbd>
      </button>
      <Show
        when={inSettings()}
        fallback={
          <nav aria-label={t('appShell.nav.main')} class="flex-1">
            <ul class="m-0 flex list-none flex-col gap-1 p-0">
              <For each={screensOf(props.organization)}>
                {(item) => (
                  <li>
                    <NavLink href={item.href} icon={item.icon} path={props.path}>
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
          <NavLink href={props.back.href} icon="back" path={props.path}>
            {t('appShell.nav.back', { screen: t(`appShell.nav.${props.back.label}`) })}
          </NavLink>
          <Show when={props.organization}>
            {(organization) => (
              <SettingsGroup
                label={t('appShell.nav.organization')}
                items={settingsOf(organization())}
                path={props.path}
                name={(label) => t(`appShell.nav.${label}`)}
              />
            )}
          </Show>
          <SettingsGroup
            label={t('appShell.nav.account')}
            items={accountSettings}
            path={props.path}
            name={(label) => t(`appShell.nav.${label}`)}
          />
        </nav>
      </Show>
      <div class="border-t border-border-subtle pt-3">
        <PersonMenu signOut={props.signOut} />
      </div>
    </div>
  )
}
