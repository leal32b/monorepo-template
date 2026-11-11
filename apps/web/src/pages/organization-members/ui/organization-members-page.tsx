import { covers } from '@repo/contracts'
import { Avatar, Badge, createPanels, ListPanel, ListRow, ListSection, PanelButton, type Panels } from '@repo/ui'
import { useNavigate } from '@solidjs/router'
import { createSignal, For, Match, Show, Switch } from 'solid-js'
import {
  isLastOwner,
  type Member,
  membersQuery,
  permissionsOfRoles,
  type Role,
  rolesQuery,
  useOrganization,
  useOrganizations,
  useRoleLabel
} from '#entities/organizations'
import { useSession } from '#entities/sessions'
import { ChangeMemberRoleForm, LeaveOrganizationForm, RemoveMemberForm } from '#features/organizations/manage-members'
import { createRead, readAgain, updateRead, useAuth } from '#shared/api'
import { useI18n } from '#shared/config'
import { ReadFailure } from '#shared/ui'
import { AppShell } from '#widgets/app-shell'
import { InvitationsSection } from './invitations-section'

type Team = { members: Member[]; roles: Role[] }

/**
 * `/:orgSlug/settings/members`: everyone in the organization, with their roles, and its invitations.
 * Anyone in it may read the list; what the buttons offer follows what the caller holds (ADR 0033). An
 * action the caller may take in general shows on every row, and is disabled, with the reason in the
 * row, where it cannot be taken: on a person whose roles grant more than the caller's, or the only
 * owner leaving (D7). An action the caller may never take does not show. One form opens at a time on
 * the whole screen, inline below its row; a person who leaves the list is said below the section.
 *
 * The people, the roles and the invitations are read together, by keys other screens share (ADR 0038).
 */
export function OrganizationMembersPage() {
  const { t } = useI18n()
  const panels = createPanels()

  return (
    <AppShell title={t('organizationMembers.title')}>
      <ReadFailure message={t('organizationMembers.unavailable')}>
        <People panels={panels} />
        <InvitationsSection panels={panels} />
      </ReadFailure>
    </AppShell>
  )
}

/** The people of the organization, with what the caller may do to each. */
function People(props: { panels: Panels }) {
  const { t } = useI18n()
  const auth = useAuth()
  const navigate = useNavigate()
  const user = useSession()
  const current = useOrganization()
  const { refetch: refetchOrganizations } = useOrganizations()
  const roleLabel = useRoleLabel()
  const id = current.organization.id
  const members = membersQuery(auth)
  const roles = rolesQuery(auth)
  const memberList = createRead(() => members(id), members.keyFor(id))
  const roleList = createRead(() => roles(id), roles.keyFor(id))
  const team = (): Team | undefined => {
    const people = memberList()
    const all = roleList()
    return people && all ? { members: people, roles: all } : undefined
  }
  /** A change to the people, drawn on every screen that reads them. */
  const change = (edit: (people: Member[]) => Member[]) => updateRead(members.keyFor(id), edit)
  const panels = props.panels
  const [rowStatus, setRowStatus] = createSignal<{ member: string; text: string }>()
  const [sectionStatus, setSectionStatus] = createSignal<string>()

  const canChange = () => current.can('member', 'update')
  const canRemove = () => current.can('member', 'delete')
  const forget = () => {
    setRowStatus(undefined)
    setSectionStatus(undefined)
  }
  /** The person left the list (removed here, or already gone): said below the section, which takes focus. */
  const left = (text: string) => {
    panels.dismiss()
    setSectionStatus(text)
  }

  /** One person's row. What it offers is read as it is drawn, since one change can alter another row (who is the last owner). */
  const rowOf = (member: Member, data: () => Team) => {
    const me = member.userId === user.id
    const lastOwner = () => isLastOwner(member, data().members)
    const held = () => current.membership.permissions
    const outranks = () => !me && !covers(held(), permissionsOfRoles(member.roles, data().roles))
    const note = () =>
      me && lastOwner()
        ? t('organizationMembers.notes.lastOwner')
        : outranks() && (canChange() || canRemove())
          ? t('organizationMembers.notes.outranks')
          : undefined
    const gone = () => {
      left(t('organizationMembers.errors.gone'))
      readAgain(members.keyFor(id))
    }

    return (
      <ListRow
        avatar={<Avatar name={member.name} />}
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
          <Show
            when={!me}
            fallback={
              <PanelButton panels={panels} panel={`leave:${member.id}`} onOpen={forget} disabled={lastOwner()}>
                {t('organizationMembers.actions.leave')}
              </PanelButton>
            }
          >
            <Show when={canChange()}>
              <PanelButton panels={panels} panel={`role:${member.id}`} onOpen={forget} disabled={outranks()}>
                {t('organizationMembers.actions.changeRole')}
              </PanelButton>
            </Show>
            <Show when={canRemove()}>
              <PanelButton panels={panels} panel={`remove:${member.id}`} onOpen={forget} disabled={outranks()}>
                {t('organizationMembers.actions.remove')}
              </PanelButton>
            </Show>
          </Show>
        }
        panel={
          <Switch>
            <Match when={panels.isOpen(`role:${member.id}`)}>
              <ListPanel label={t('organizationMembers.actions.changeRole')}>
                <ChangeMemberRoleForm
                  organizationId={current.organization.id}
                  member={member}
                  roles={data().roles}
                  held={held()}
                  onChanged={(role) => {
                    change((people) =>
                      people.map((candidate) =>
                        candidate.id === member.id ? { ...candidate, roles: [role] } : candidate
                      )
                    )
                    setRowStatus({
                      member: member.id,
                      text: t('organizationMembers.changeRole.saved', { role: roleLabel(role) })
                    })
                    panels.close()
                  }}
                  onGone={gone}
                  onCancel={panels.close}
                />
              </ListPanel>
            </Match>
            <Match when={panels.isOpen(`remove:${member.id}`)}>
              <ListPanel label={t('organizationMembers.actions.remove')}>
                <RemoveMemberForm
                  organizationId={current.organization.id}
                  organizationName={current.organization.name}
                  member={member}
                  onRemoved={() => {
                    change((people) => people.filter((candidate) => candidate.id !== member.id))
                    left(t('organizationMembers.remove.removed', { name: member.name }))
                  }}
                  onGone={gone}
                  onCancel={panels.close}
                />
              </ListPanel>
            </Match>
            <Match when={panels.isOpen(`leave:${member.id}`)}>
              <ListPanel label={t('organizationMembers.actions.leave')}>
                <LeaveOrganizationForm
                  organization={current.organization}
                  onLeft={() => {
                    // Leave first, then read the organizations again: `/` opens another, or onboarding.
                    navigate('/', { replace: true })
                    refetchOrganizations()
                  }}
                  onCancel={panels.close}
                />
              </ListPanel>
            </Match>
          </Switch>
        }
      />
    )
  }

  return (
    <Show when={team()}>
      {(loaded) => (
        <ListSection
          title={t('organizationMembers.section.title')}
          description={t(
            canChange() || canRemove()
              ? 'organizationMembers.section.description'
              : 'organizationMembers.section.readOnly',
            { name: current.organization.name }
          )}
          status={sectionStatus()}
        >
          <For each={loaded().members}>{(member) => rowOf(member, loaded)}</For>
        </ListSection>
      )}
    </Show>
  )
}
