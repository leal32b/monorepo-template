import { covers, statements } from '@repo/contracts'
import { Alert, Badge, Button, SettingsRow, SettingsSection } from '@repo/ui'
import { createResource, createSignal, For, Match, Show, Switch } from 'solid-js'
import {
  holdersOf,
  listMembers,
  listPendingInvitations,
  listRoles,
  type Member,
  type PendingInvitation,
  type Role,
  useOrganization,
  useRoleLabel
} from '#entities/organizations'
import { DeleteRoleForm, RoleForm, RoleView } from '#features/organizations/manage-roles'
import { useAuth } from '#shared/api'
import { useI18n } from '#shared/config'
import { AppShell } from '#widgets/app-shell'
import { Panel, type PanelName } from './panel'

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
 */
export function OrganizationRolesPage() {
  const { t, locale } = useI18n()
  const auth = useAuth()
  const current = useOrganization()
  const roleLabel = useRoleLabel()
  const [team, { refetch, mutate }] = createResource(
    () => current.organization.id,
    async (organizationId): Promise<Team> => {
      const [members, roles, invitations] = await Promise.all([
        listMembers(auth, organizationId),
        listRoles(auth, organizationId),
        listPendingInvitations(auth, organizationId, new Date())
      ])
      return { members, roles, invitations }
    }
  )
  const [open, setOpen] = createSignal<{ panel: PanelName; role?: string }>()
  const [rowStatus, setRowStatus] = createSignal<{ role: string; text: string }>()
  const [pageStatus, setPageStatus] = createSignal<string>()
  let status: HTMLParagraphElement | undefined

  const held = () => current.membership.permissions
  const close = () => setOpen(undefined)
  const openPanel = (panel: PanelName, role?: Role) => {
    setRowStatus(undefined)
    setPageStatus(undefined)
    setOpen(role === undefined ? { panel } : { panel, role: role.name })
  }
  const opened = (panel: PanelName, role?: Role) => open()?.panel === panel && open()?.role === role?.name
  /** The role left the list (deleted here, or already gone): focus goes to the line that says so. */
  const announce = (text: string) => {
    close()
    setPageStatus(text)
    queueMicrotask(() => status?.focus())
  }
  const gone = () => {
    announce(t('organizationRoles.errors.gone'))
    void refetch()
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
    const busy = () => open() !== undefined
    const note = () =>
      inUse()
        ? t('organizationRoles.notes.heldBy', { who: whoIn(holders().members, holders().invitations) })
        : exceeds() && (current.can('ac', 'update') || current.can('ac', 'delete'))
          ? t('organizationRoles.notes.exceeds')
          : undefined
    const reason = () =>
      role.builtIn
        ? t('organizationRoles.builtIn.readOnly')
        : exceeds()
          ? t('organizationRoles.notes.exceeds')
          : undefined

    return (
      <SettingsRow
        icon="key"
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
            <Show when={!canEdit() && !opened('view', role)}>
              <Button disabled={busy()} onClick={() => openPanel('view', role)}>
                {t('organizationRoles.actions.view')}
              </Button>
            </Show>
            <Show when={canEdit() && !opened('edit', role)}>
              <Button disabled={busy()} onClick={() => openPanel('edit', role)}>
                {t('organizationRoles.actions.edit')}
              </Button>
            </Show>
            <Show when={canDelete() && !opened('delete', role)}>
              <Button disabled={busy() || inUse()} onClick={() => openPanel('delete', role)}>
                {t('organizationRoles.actions.delete')}
              </Button>
            </Show>
          </>
        }
        panel={
          <>
            <Show when={opened('view', role)}>
              <Panel label={t('organizationRoles.actions.view')}>
                <RoleView role={role} reason={reason()} onClose={close} />
              </Panel>
            </Show>
            <Show when={opened('edit', role)}>
              <Panel label={t('organizationRoles.actions.edit')}>
                <RoleForm
                  organizationId={current.organization.id}
                  role={role}
                  roles={data().roles}
                  held={held()}
                  nameLocked={inUse()}
                  onSaved={(saved) => {
                    mutate({
                      ...data(),
                      roles: data().roles.map((candidate) => (candidate.name === role.name ? saved : candidate))
                    })
                    setRowStatus({ role: saved.name, text: t('organizationRoles.form.saved', { role: saved.name }) })
                    close()
                  }}
                  onGone={gone}
                  onCancel={close}
                />
              </Panel>
            </Show>
            <Show when={opened('delete', role)}>
              <Panel label={t('organizationRoles.actions.delete')}>
                <DeleteRoleForm
                  organizationId={current.organization.id}
                  role={role}
                  onDeleted={() => {
                    mutate({ ...data(), roles: data().roles.filter((candidate) => candidate.name !== role.name) })
                    announce(t('organizationRoles.remove.deleted', { role: role.name }))
                  }}
                  onGone={gone}
                  onCancel={close}
                />
              </Panel>
            </Show>
          </>
        }
      />
    )
  }

  return (
    <AppShell title={t('organizationRoles.title')}>
      <Switch>
        <Match when={team.error}>
          <Alert
            variant="error"
            action={<Button onClick={() => void refetch()}>{t('organizationRoles.retry')}</Button>}
          >
            {t('organizationRoles.unavailable')}
          </Alert>
        </Match>
        <Match when={team.state === 'ready' && team()}>
          {(loaded) => {
            const custom = () => loaded().roles.filter((role) => !role.builtIn)
            return (
              <>
                <SettingsSection
                  title={t('organizationRoles.builtIn.title')}
                  description={t('organizationRoles.builtIn.description')}
                >
                  <For each={loaded().roles.filter((role) => role.builtIn)}>{(role) => rowOf(role, loaded)}</For>
                </SettingsSection>
                <Show when={current.can('ac', 'create') || custom().length > 0}>
                  <SettingsSection
                    title={t('organizationRoles.custom.title', { name: current.organization.name })}
                    description={t('organizationRoles.custom.description')}
                  >
                    <Show when={current.can('ac', 'create')}>
                      <SettingsRow
                        icon="plus"
                        title={t('organizationRoles.custom.create.title')}
                        description={t('organizationRoles.custom.create.description')}
                        action={
                          <Show when={!opened('create')}>
                            <Button disabled={open() !== undefined} onClick={() => openPanel('create')}>
                              {t('organizationRoles.custom.create.open')}
                            </Button>
                          </Show>
                        }
                        panel={
                          <Show when={opened('create')}>
                            <Panel label={t('organizationRoles.custom.create.open')}>
                              <RoleForm
                                organizationId={current.organization.id}
                                roles={loaded().roles}
                                held={held()}
                                onSaved={(saved) => {
                                  mutate({ ...loaded(), roles: [...loaded().roles, saved] })
                                  setRowStatus({
                                    role: saved.name,
                                    text: t('organizationRoles.form.created', { role: saved.name })
                                  })
                                  close()
                                }}
                                onGone={gone}
                                onCancel={close}
                              />
                            </Panel>
                          </Show>
                        }
                      />
                    </Show>
                    <For each={custom()}>{(role) => rowOf(role, loaded)}</For>
                  </SettingsSection>
                </Show>
                <p
                  ref={(line) => {
                    status = line
                  }}
                  tabIndex={-1}
                  role="status"
                  class="-mt-4 text-sm text-muted-foreground outline-none"
                >
                  {pageStatus()}
                </p>
              </>
            )
          }}
        </Match>
      </Switch>
    </AppShell>
  )
}
