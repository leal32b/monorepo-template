import { covers } from '@repo/contracts'
import { Alert, Badge, Button, SettingsRow, SettingsSection } from '@repo/ui'
import { useNavigate } from '@solidjs/router'
import { createResource, createSignal, For, Match, Show, Switch } from 'solid-js'
import {
  isLastOwner,
  listMembers,
  listRoles,
  type Member,
  permissionsOfRoles,
  type Role,
  useOrganization,
  useOrganizations,
  useRoleLabel
} from '#entities/organizations'
import { useSession } from '#entities/sessions'
import { ChangeMemberRoleForm, LeaveOrganizationForm, RemoveMemberForm } from '#features/manage-members'
import { useAuth } from '#shared/api'
import { useI18n } from '#shared/config'
import { AppShell } from '#widgets/app-shell'
import { Panel, type PanelName } from './panel'

/**
 * `/:orgSlug/settings/members`: everyone in the organization, with their roles. Anyone in it may read
 * the list; what the buttons offer follows what the caller holds (ADR 0033). Whoever may update members
 * changes a role, whoever may delete removes one, but never a person whose roles grant more than the
 * caller's, and never a role the caller could not give: those show disabled, and a person above the
 * caller says so. Anyone may leave, except the only owner, who is told to name another first (D7). A form
 * opens inline below its row, one at a time.
 */
export function OrganizationMembersPage() {
  const { t } = useI18n()
  const auth = useAuth()
  const navigate = useNavigate()
  const user = useSession()
  const current = useOrganization()
  const { refetch: refetchOrganizations } = useOrganizations()
  const roleLabel = useRoleLabel()
  const [team, { refetch, mutate }] = createResource(
    () => current.organization.id,
    async (organizationId) => {
      const [members, roles] = await Promise.all([listMembers(auth, organizationId), listRoles(auth, organizationId)])
      return { members, roles }
    }
  )
  const [open, setOpen] = createSignal<{ panel: PanelName; member: string }>()
  const [rowStatus, setRowStatus] = createSignal<{ member: string; text: string }>()
  const [pageStatus, setPageStatus] = createSignal<string>()
  let status: HTMLParagraphElement | undefined

  const manages = () => current.can('member', 'update') || current.can('member', 'delete')
  const close = () => setOpen(undefined)
  const openPanel = (panel: PanelName, member: Member) => {
    setRowStatus(undefined)
    setPageStatus(undefined)
    setOpen({ panel, member: member.id })
  }
  const opened = (panel: PanelName, member: Member) => open()?.panel === panel && open()?.member === member.id
  /** The person left the list (removed here, or already gone): focus goes to the line that says so. */
  const announce = (text: string) => {
    close()
    setPageStatus(text)
    queueMicrotask(() => status?.focus())
  }

  type Team = { members: Member[]; roles: Role[] }

  /** One person's row. What it offers is read as it is drawn, since one change can alter another row (who is the last owner). */
  const rowOf = (member: Member, data: () => Team) => {
    const me = member.userId === user.id
    const lastOwner = () => isLastOwner(member, data().members)
    const held = () => current.membership.permissions
    const outranks = () => !me && !covers(held(), permissionsOfRoles(member.roles, data().roles))
    const busy = () => open() !== undefined
    const canChange = () => !me && !outranks() && current.can('member', 'update')
    const canRemove = () => !me && !outranks() && current.can('member', 'delete')
    const note = () =>
      me && lastOwner()
        ? t('organizationMembers.notes.lastOwner')
        : outranks() && manages()
          ? t('organizationMembers.notes.outranks')
          : undefined

    return (
      <SettingsRow
        icon="profile"
        title={member.name}
        badge={
          <>
            <Show when={me}>
              <Badge>{t('organizationMembers.you')}</Badge>
            </Show>
            <For each={member.roles}>{(role) => <Badge>{roleLabel(role)}</Badge>}</For>
          </>
        }
        description={member.email}
        note={note()}
        status={rowStatus()?.member === member.id ? rowStatus()?.text : undefined}
        action={
          <>
            <Show when={canChange() && !opened('role', member)}>
              <Button disabled={busy()} onClick={() => openPanel('role', member)}>
                {t('organizationMembers.actions.changeRole')}
              </Button>
            </Show>
            <Show when={canRemove() && !opened('remove', member)}>
              <Button disabled={busy()} onClick={() => openPanel('remove', member)}>
                {t('organizationMembers.actions.remove')}
              </Button>
            </Show>
            <Show when={me && !lastOwner() && !opened('leave', member)}>
              <Button disabled={busy()} onClick={() => openPanel('leave', member)}>
                {t('organizationMembers.actions.leave')}
              </Button>
            </Show>
          </>
        }
        panel={
          <>
            <Show when={opened('role', member)}>
              <Panel label={t('organizationMembers.actions.changeRole')}>
                <ChangeMemberRoleForm
                  organizationId={current.organization.id}
                  member={member}
                  roles={data().roles}
                  held={held()}
                  onChanged={(role) => {
                    mutate({
                      ...data(),
                      members: data().members.map((candidate) =>
                        candidate.id === member.id ? { ...candidate, roles: [role] } : candidate
                      )
                    })
                    setRowStatus({
                      member: member.id,
                      text: t('organizationMembers.changeRole.saved', { role: roleLabel(role) })
                    })
                    close()
                  }}
                  onGone={() => {
                    announce(t('organizationMembers.errors.gone'))
                    void refetch()
                  }}
                  onCancel={close}
                />
              </Panel>
            </Show>
            <Show when={opened('remove', member)}>
              <Panel label={t('organizationMembers.actions.remove')}>
                <RemoveMemberForm
                  organizationId={current.organization.id}
                  organizationName={current.organization.name}
                  member={member}
                  onRemoved={() => {
                    mutate({ ...data(), members: data().members.filter((candidate) => candidate.id !== member.id) })
                    announce(t('organizationMembers.remove.removed', { name: member.name }))
                  }}
                  onGone={() => {
                    announce(t('organizationMembers.errors.gone'))
                    void refetch()
                  }}
                  onCancel={close}
                />
              </Panel>
            </Show>
            <Show when={opened('leave', member)}>
              <Panel label={t('organizationMembers.actions.leave')}>
                <LeaveOrganizationForm
                  organization={current.organization}
                  onLeft={() => {
                    // Leave first, then read the organizations again: `/` opens another, or onboarding.
                    navigate('/', { replace: true })
                    refetchOrganizations()
                  }}
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
    <AppShell title={t('organizationMembers.title')}>
      <Switch>
        <Match when={team.error}>
          <Alert
            variant="error"
            action={<Button onClick={() => void refetch()}>{t('organizationMembers.retry')}</Button>}
          >
            {t('organizationMembers.unavailable')}
          </Alert>
        </Match>
        <Match when={team.state === 'ready' && team()}>
          {(loaded) => (
            <>
              <SettingsSection
                title={t('organizationMembers.section.title')}
                description={t(
                  manages() ? 'organizationMembers.section.description' : 'organizationMembers.section.readOnly',
                  { name: current.organization.name }
                )}
              >
                <For each={loaded().members}>{(member) => rowOf(member, loaded)}</For>
              </SettingsSection>
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
          )}
        </Match>
      </Switch>
    </AppShell>
  )
}
