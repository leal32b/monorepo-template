import {
  Avatar,
  Menu,
  MenuHeader,
  MenuItem,
  MenuRadioGroup,
  MenuRadioItem,
  MenuSeparator,
  MenuTriggerContent,
  menuTriggerClass
} from '@repo/ui'
import { A, useNavigate } from '@solidjs/router'
import { createSignal, For, onMount, Show } from 'solid-js'
import { useImpersonation } from '#entities/impersonations'
import { homeOf, membersQuery, type Organization, useOptionalOrganizations } from '#entities/organizations'
import { useAuth } from '#shared/api'
import { useI18n } from '#shared/config'
import { type OrganizationDetails, useOrganizationDetails } from '../model/shell'

/**
 * How many people are in the organization, read when its menu opens (ADR 0080): the members' query, which
 * the members screen shares, so a list read before answers at once. Nothing is said until it is in, nor if
 * it cannot be read, nor during an operator's visit, which Better Auth's members list does not know.
 */
function useMemberCount(organization: Organization) {
  const auth = useAuth()
  const impersonation = useImpersonation()
  const [count, setCount] = createSignal<number>()
  onMount(() => {
    if (impersonation.current()?.organization.id === organization.id) return
    membersQuery(auth)(organization.id).then(
      (members) => setCount(members.length),
      () => undefined
    )
  })
  return count
}

/** The plan and the number of members, under the organization's name at the top of its menu. */
function OrganizationHeader(props: { organization: Organization; details: OrganizationDetails | undefined }) {
  const { t } = useI18n()
  const count = useMemberCount(props.organization)
  const plan = () => {
    const current = props.details?.subscription
    if (current === undefined) return undefined
    if (current.status === 'trialing') return t('subscription.trial')
    return current.plan === null ? undefined : t(`subscription.plans.${current.plan}`)
  }
  const members = () => {
    const known = count()
    if (known === undefined) return undefined
    return known === 1
      ? t('appShell.organizations.members.one')
      : t('appShell.organizations.members.other', { count: known })
  }
  const line = () => [plan(), members()].filter((part) => part !== undefined).join(' · ')

  return (
    <MenuHeader>
      <span class="max-w-64 truncate font-medium">{props.organization.name}</span>
      {/* A line always there, so the count arriving does not move the items below. */}
      <span class="min-h-5 truncate text-muted-foreground">{line()}</span>
    </MenuHeader>
  )
}

/**
 * The organization's menu, at the top of the side menu and of a phone's screen (ADR 0080): what belongs to
 * the organization opens from its name. Its plan and members, the way to invite people and to its settings,
 * the organizations to switch to (ADR 0034), and creating one. Choosing one opens its home, since the
 * screens differ by what the roles allow. While the list is read again it keeps the last one (W10); if it
 * cannot be read, the menu holds the current organization alone. Its mark is its logo once it has one (ADR
 * 0076), square, as an organization's always is. Outside any organization it is the product's name, which
 * leads to creating one.
 */
export function OrganizationMenu(props: { organization: Organization | undefined }) {
  const { t } = useI18n()
  const navigate = useNavigate()
  const organizations = useOptionalOrganizations()
  const impersonation = useImpersonation()

  return (
    <Show
      when={props.organization}
      keyed
      fallback={
        <A href="/onboarding" class="truncate px-2 font-semibold tracking-tight">
          {t('app.name')}
        </A>
      }
    >
      {(organization) => {
        const details = useOrganizationDetails(organization)
        const home = homeOf(organization)
        const known = () => organizations?.known() ?? [organization]
        /** During an operator's visit the members screen asks Better Auth, which knows no visit (ADR 0077). */
        const visiting = () => impersonation.current()?.organization.id === organization.id
        return (
          <Menu
            placement="bottom-start"
            triggerClass={menuTriggerClass}
            trigger={
              <MenuTriggerContent
                avatar={<Avatar name={organization.name} src={details()?.logo?.url} shape="square" size="sm" />}
                label={organization.name}
              />
            }
          >
            <OrganizationHeader organization={organization} details={details()} />
            <MenuSeparator />
            <Show when={!visiting()}>
              <MenuItem icon="invite" onSelect={() => navigate(`${home}/settings/members`)}>
                {t('appShell.organizations.invite')}
              </MenuItem>
            </Show>
            <MenuItem icon="preferences" onSelect={() => navigate(`${home}/settings`)}>
              {t('appShell.nav.organizationSettings')}
            </MenuItem>
            <MenuSeparator />
            <MenuRadioGroup
              label={t('appShell.organizations.label')}
              value={organization.slug}
              onChange={(slug) => navigate(homeOf(known().find((candidate) => candidate.slug === slug)))}
            >
              <For each={known()}>
                {(candidate) => (
                  <MenuRadioItem value={candidate.slug}>
                    <span class="max-w-64 truncate">{candidate.name}</span>
                  </MenuRadioItem>
                )}
              </For>
            </MenuRadioGroup>
            <MenuSeparator />
            <MenuItem icon="plus" onSelect={() => navigate('/onboarding')}>
              {t('appShell.organizations.create')}
            </MenuItem>
          </Menu>
        )
      }}
    </Show>
  )
}
