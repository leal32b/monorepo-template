import {
  Avatar,
  Menu,
  MenuItem,
  MenuRadioGroup,
  MenuRadioItem,
  MenuSeparator,
  MenuTriggerContent,
  menuTriggerClass
} from '@repo/ui'
import { useNavigate } from '@solidjs/router'
import { For } from 'solid-js'
import { homeOf, type Organization, useOrganizations } from '#entities/organizations'
import { useI18n } from '#shared/config'

/**
 * The organization you are in, at the top of the side menu, and a menu to move to another of yours or
 * to create one (ADR 0034). Choosing one opens its home, since the screens differ by what the roles
 * allow. Until the list is read, or if it cannot be, the menu holds the current organization alone: a
 * tenant screen only opens once the list was read, so the gap is a refetch.
 */
export function OrganizationSwitcher(props: {
  /** The organization of the screen. */
  organization: Organization
  /** Called after the menu navigated, so the phone drawer can close. */
  onNavigate?: (() => void) | undefined
}) {
  const { t } = useI18n()
  const navigate = useNavigate()
  const { list } = useOrganizations()
  // A resource in error throws when read, so the list is read only once it is ready.
  const organizations = () => (list.state === 'ready' ? list() : [props.organization])

  const open = (path: string) => {
    navigate(path)
    props.onNavigate?.()
  }

  return (
    <Menu
      placement="bottom-start"
      triggerClass={menuTriggerClass}
      trigger={
        <MenuTriggerContent
          avatar={<Avatar name={props.organization.name} shape="square" size="sm" />}
          label={props.organization.name}
        />
      }
    >
      <MenuRadioGroup
        label={t('appShell.organizations.label')}
        value={props.organization.slug}
        onChange={(slug) => open(homeOf(organizations().find((organization) => organization.slug === slug)))}
      >
        <For each={organizations()}>
          {(organization) => (
            <MenuRadioItem value={organization.slug}>
              <span class="max-w-64 truncate">{organization.name}</span>
            </MenuRadioItem>
          )}
        </For>
      </MenuRadioGroup>
      <MenuSeparator />
      <MenuItem icon="plus" onSelect={() => open('/onboarding')}>
        {t('appShell.organizations.create')}
      </MenuItem>
    </Menu>
  )
}
