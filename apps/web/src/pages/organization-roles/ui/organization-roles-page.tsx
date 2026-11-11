import { covers, statements } from '@repo/contracts'
import { Badge, createPanels, ListPanel, ListRow, ListSection, PanelButton } from '@repo/ui'
import { createSignal, For, Show } from 'solid-js'
import {
  holdersOf,
  type Member,
  membersQuery,
  type PendingInvitation,
  pendingInvitationsQuery,
  type Role,
  rolesQuery,
  useOrganization,
  useRoleLabel
} from '#entities/organizations'
import { DeleteRoleForm, RoleForm, RoleView } from '#features/organizations/manage-roles'
import { createRead, readAgain, updateRead, useAuth } from '#shared/api'
import { useI18n } from '#shared/config'
import { ReadFailure } from '#shared/ui'
import { AppShell } from '#widgets/app-shell'

type Team = { members: Member[]; roles: Role[]; invitations: PendingInvitation[] }

/** The most names a note lists before it says how many more there are. */
const LISTED = 5
const totalPermissions = Object.values(statements).reduce((sum, actions) => sum + actions.length, 0)
const countOf = (role: Role) =>
  (Object.values(role.permissions) as readonly (readonly string[])[]).reduce((sum, actions) => sum + actions.length, 0)

/**
 * `/:orgSlug/settings/roles`: what each role may do. The three built-in roles are shown and cannot change;
 * the organization's own can be created, edited and deleted by whoever holds the permission for it, as a
 * grid of checkboxes. What the caller does not hold is disabled in the grid, and a role that grants more
 * than the caller holds can only be viewed. A role a member or a pending invitation holds cannot be
 * renamed or deleted: the row names who holds it. A form opens inline below its row, one at a time.
 *
 * The members, the roles and the invitations are read by the keys the members screen reads them by, so
 * coming from it draws at once (ADR 0038).
 */
export function OrganizationRolesPage() {
  const { t } = useI18n()

  return (
    <AppShell title={t('organizationRoles.title')}>
      <ReadFailure message={t('organizationRoles.unavailable')}>
        <Roles />
      </ReadFailure>
    </AppShell>
  )
}

/** The roles once read, built in and the organization's own, with what the caller may do to each. */
function Roles() {
  const { t, locale } = useI18n()
  const auth = useAuth()
  const current = useOrganization()
  const roleLabel = useRoleLabel()
  const id = current.organization.id
  const members = membersQuery(auth)
  const roles = rolesQuery(auth)
  const pending = pendingInvitationsQuery(auth)
  const memberList = createRead(() => members(id), members.keyFor(id))
  const roleList = createRead(() => roles(id), roles.keyFor(id))
  const invitationList = createRead(() => pending(id), pending.keyFor(id))
  const team = (): Team | undefined => {
    const people = memberList()
    const all = roleList()
    const invited = invitationList()
    return people && all && invited ? { members: people, roles: all, invitations: invited } : undefined
  }
  /** A change to the roles, drawn on every screen that reads them. */
  const change = (edit: (list: Role[]) => Role[]) => updateRead(roles.keyFor(id), edit)
  const panels = createPanels()
  const [rowStatus, setRowStatus] = createSignal<{ role: string; text: string }>()
  const [sectionStatus, setSectionStatus] = createSignal<string>()

  const held = () => current.membership.permissions
  const forget = () => {
    setRowStatus(undefined)
    setSectionStatus(undefined)
  }
  /** The role left the list (deleted here, or already gone): said below the section, which takes focus. */
  const left = (text: string) => {
    panels.dismiss()
    setSectionStatus(text)
  }
  const gone = () => {
    left(t('organizationRoles.errors.gone'))
    readAgain(roles.keyFor(id))
  }

  /** "Grace, Linus and ada@example.com (invited)" in the user's language, ending in how many more there are. */
  const whoIn = (members: readonly Member[], invitations: readonly PendingInvitation[]) => {
    const names = [
      ...members.map((member) => member.name),
      ...invitations.map((invitation) => t('organizationRoles.notes.invited', { email: invitation.email }))
    ]
    const listed = new Intl.ListFormat(locale(), { style: 'long', type: 'conjunction' }).format(names.slice(0, LISTED))
    return names.length > LISTED
      ? `${listed} ${t('organizationRoles.notes.more', { count: names.length - LISTED })}`
      : listed
  }

  const rowOf = (role: Role, data: () => Team) => {
    const holders = () => holdersOf(role.name, data().members, data().invitations)
    const inUse = () => !role.builtIn && holders().members.length + holders().invitations.length > 0
    const exceeds = () => !role.builtIn && !covers(held(), role.permissions)
    const canEdit = () => !role.builtIn && !exceeds() && current.can('ac', 'update')
    const canDelete = () => !role.builtIn && !exceeds() && current.can('ac', 'delete')
    const note = () =>
      inUse()
        ? t('organizationRoles.notes.heldBy', { who: whoIn(holders().members, holders().invitations) })
        : exceeds() && (current.can('ac', 'update') || current.can('ac', 'delete'))
          ? t('organizationRoles.notes.exceeds')
          : undefined

    return (
      <ListRow
        icon="role"
        title={roleLabel(role.name)}
        badge={
          <Show when={role.builtIn}>
            <Badge>{t('organizationRoles.builtIn.badge')}</Badge>
          </Show>
        }
        description={t('organizationRoles.summary', { count: countOf(role), total: totalPermissions })}
        note={note()}
        status={rowStatus()?.role === role.name ? rowStatus()?.text : undefined}
        action={
          <>
            <Show
              when={canEdit()}
              fallback={
                <PanelButton panels={panels} panel={`view:${role.name}`} onOpen={forget}>
                  {t('organizationRoles.actions.view')}
                </PanelButton>
              }
            >
              <PanelButton panels={panels} panel={`edit:${role.name}`} onOpen={forget}>
                {t('organizationRoles.actions.edit')}
              </PanelButton>
            </Show>
            <Show when={canDelete()}>
              <PanelButton panels={panels} panel={`delete:${role.name}`} onOpen={forget} disabled={inUse()}>
                {t('organizationRoles.actions.delete')}
              </PanelButton>
            </Show>
          </>
        }
        panel={
          <>
            <Show when={panels.isOpen(`view:${role.name}`)}>
              <ListPanel label={t('organizationRoles.actions.view')}>
                <RoleView role={role} onClose={panels.close} />
              </ListPanel>
            </Show>
            <Show when={panels.isOpen(`edit:${role.name}`)}>
              <ListPanel label={t('organizationRoles.actions.edit')}>
                <RoleForm
                  organizationId={current.organization.id}
                  role={role}
                  roles={data().roles}
                  held={held()}
                  nameLocked={inUse()}
                  onSaved={(saved) => {
                    change((list) => list.map((candidate) => (candidate.name === role.name ? saved : candidate)))
                    setRowStatus({
                      role: saved.name,
                      text: t('organizationRoles.form.saved', { role: roleLabel(saved.name) })
                    })
                    panels.close()
                  }}
                  onGone={gone}
                  onCancel={panels.close}
                />
              </ListPanel>
            </Show>
            <Show when={panels.isOpen(`delete:${role.name}`)}>
              <ListPanel label={t('organizationRoles.actions.delete')}>
                <DeleteRoleForm
                  organizationId={current.organization.id}
                  role={role}
                  onDeleted={() => {
                    change((list) => list.filter((candidate) => candidate.name !== role.name))
                    left(t('organizationRoles.remove.deleted', { role: roleLabel(role.name) }))
                  }}
                  onGone={gone}
                  onCancel={panels.close}
                />
              </ListPanel>
            </Show>
          </>
        }
      />
    )
  }

  return (
    <Show when={team()}>
      {(loaded) => {
        const custom = () => loaded().roles.filter((role) => !role.builtIn)
        return (
          <>
            <ListSection
              title={t('organizationRoles.builtIn.title')}
              description={t('organizationRoles.builtIn.description')}
            >
              <For each={loaded().roles.filter((role) => role.builtIn)}>{(role) => rowOf(role, loaded)}</For>
            </ListSection>
            <Show when={current.can('ac', 'create') || custom().length > 0}>
              <ListSection
                title={t('organizationRoles.custom.title', { name: current.organization.name })}
                description={t('organizationRoles.custom.description')}
                status={sectionStatus()}
              >
                <Show when={current.can('ac', 'create')}>
                  <ListRow
                    icon="plus"
                    title={t('organizationRoles.custom.create.title')}
                    description={t('organizationRoles.custom.create.description')}
                    action={
                      <PanelButton panels={panels} panel="create" onOpen={forget}>
                        {t('organizationRoles.custom.create.open')}
                      </PanelButton>
                    }
                    panel={
                      <Show when={panels.isOpen('create')}>
                        <ListPanel label={t('organizationRoles.custom.create.open')}>
                          <RoleForm
                            organizationId={current.organization.id}
                            roles={loaded().roles}
                            held={held()}
                            onSaved={(saved) => {
                              change((list) => [...list, saved])
                              setRowStatus({
                                role: saved.name,
                                text: t('organizationRoles.form.created', { role: roleLabel(saved.name) })
                              })
                              panels.close()
                            }}
                            onGone={gone}
                            onCancel={panels.close}
                          />
                        </ListPanel>
                      </Show>
                    }
                  />
                </Show>
                <For each={custom()}>{(role) => rowOf(role, loaded)}</For>
              </ListSection>
            </Show>
          </>
        )
      }}
    </Show>
  )
}
