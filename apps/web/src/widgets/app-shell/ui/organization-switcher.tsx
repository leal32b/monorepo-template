import { Icon, Menu, MenuItem, MenuRadioGroup, MenuRadioItem, MenuSeparator } from '@repo/ui'
import { useNavigate } from '@solidjs/router'
import { For } from 'solid-js'
import { homeOf, useOrganization, useOrganizations } from '#entities/organizations'
import { useI18n } from '#shared/config'

/**
 * The organization you are in, at the top of the side menu, and a menu to move to another of yours or
 * to create one (ADR 0034). Choosing one opens its home, since the screens differ by what the roles
 * allow. Until the list is read, or if it cannot be, the menu holds the current organization alone: a
 * tenant screen only opens once the list was read, so the gap is a refetch.
 */
export function OrganizationSwitcher(props: {
  /** Called after the menu navigated, so the phone drawer can close. */
  onNavigate?: (() => void) | undefined
}) {
  const { t } = useI18n()
  const navigate = useNavigate()
  const current = useOrganization()
  const { list } = useOrganizations()
  // A resource in error throws when read, so the list is read only once it is ready.
  const organizations = () => (list.state === 'ready' ? list() : [current.organization])

  const open = (path: string) => {
    navigate(path)
    props.onNavigate?.()
  }

  return (
    <Menu
      placement="bottom-start"
      triggerClass="flex h-11 w-full min-w-0 cursor-pointer items-center gap-2 rounded-md px-2 text-left transition-colors hover:bg-secondary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
      trigger={
        <>
          <span
            aria-hidden="true"
            class="flex size-8 shrink-0 items-center justify-center rounded-md border border-border-subtle bg-background text-sm font-semibold"
          >
            {current.organization.name.slice(0, 1).toUpperCase()}
          </span>
          <span class="min-w-0 flex-1 truncate text-base font-semibold tracking-tight sm:text-sm">
            {current.organization.name}
          </span>
          <Icon name="expand" class="text-muted-foreground" />
        </>
      }
    >
      <MenuRadioGroup
        label={t('appShell.organizations.label')}
        value={current.organization.slug}
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
