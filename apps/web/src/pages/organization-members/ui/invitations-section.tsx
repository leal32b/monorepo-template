import {
  Avatar,
  Badge,
  PanelButton,
  type Panels,
  SettingsPanel,
  SettingsRow,
  SettingsSection,
  SettingsSkeleton
} from '@repo/ui'
import { createSignal, For, Show, Suspense } from 'solid-js'
import {
  membersQuery,
  type PendingInvitation,
  pendingInvitationsQuery,
  rolesQuery,
  useOrganization,
  useRoleLabel
} from '#entities/organizations'
import {
  InvitationFailure,
  InvitePeopleForm,
  ResendInvitation,
  RevokeInvitation
} from '#features/organizations/invite-people'
import { type AuthFailure, createRead, readAgain, useAuth } from '#shared/api'
import { useI18n } from '#shared/config'
import { formatDate } from '#shared/lib'
import { ReadFailure } from '#shared/ui'

export type InvitationsSectionProps = {
  /** The screen's panels: one form open at a time across the people and the invitations. */
  panels: Panels
}

/**
 * The invitations of the organization: a row to invite someone, and the ones still waiting for an answer,
 * each with when it expires, to send again (the way out when the email did not arrive) or to revoke.
 * Whoever may create invitations sees the first, whoever may cancel them sees the second; anyone else does
 * not see the section, and its list is not read. The list is read beside the people, under a boundary of
 * its own (ADR 0038), so it can fail or load again without the people above it going blank; while it is
 * read the first time, a placeholder holds its place. While a form is open anywhere on the screen, every
 * action here waits.
 */
export function InvitationsSection(props: InvitationsSectionProps) {
  const { t } = useI18n()
  const current = useOrganization()

  return (
    <Show when={current.can('invitation', 'create') || current.can('invitation', 'cancel')}>
      <ReadFailure message={t('organizationInvitations.unavailable')}>
        <Suspense fallback={<SettingsSkeleton label={t('appShell.loading')} rows={1} />}>
          <Invitations panels={props.panels} />
        </Suspense>
      </ReadFailure>
    </Show>
  )
}

/** The section once read: the invitations, and the people and roles its form needs, shared by key with the screen. */
function Invitations(props: InvitationsSectionProps) {
  const { t, locale } = useI18n()
  const auth = useAuth()
  const current = useOrganization()
  const roleLabel = useRoleLabel()
  const canInvite = () => current.can('invitation', 'create')
  const canRevoke = () => current.can('invitation', 'cancel')
  const id = current.organization.id
  const pending = pendingInvitationsQuery(auth)
  const members = membersQuery(auth)
  const roles = rolesQuery(auth)
  const invitations = createRead(() => pending(id), pending.keyFor(id))
  const people = createRead(() => members(id), members.keyFor(id))
  const all = createRead(() => roles(id), roles.keyFor(id))
  const loaded = () => {
    const list = invitations()
    const team = people()
    const choices = all()
    return list && team && choices ? { list, team, choices } : undefined
  }
  /** After a change, the list is read again: the screen keeps it until the answer comes. */
  const reread = () => readAgain(pending.keyFor(id))
  const [inviteStatus, setInviteStatus] = createSignal<string>()
  const [sectionStatus, setSectionStatus] = createSignal<string>()
  const [rowStatus, setRowStatus] = createSignal<{ id: string; text: string }>()
  const [rowFailure, setRowFailure] = createSignal<{ id: string; failure: AuthFailure }>()
  const [busy, setBusy] = createSignal(false)

  const waiting = () => busy() || props.panels.busy()
  const forget = () => {
    setInviteStatus(undefined)
    setSectionStatus(undefined)
    setRowStatus(undefined)
    setRowFailure(undefined)
  }

  const rowOf = (invitation: PendingInvitation) => (
    <SettingsRow
      avatar={<Avatar icon="mail" />}
      title={invitation.email}
      badge={<For each={invitation.roles}>{(role) => <Badge>{roleLabel(role)}</Badge>}</For>}
      description={t('invitations.expires', { date: formatDate(invitation.expiresAt, locale()) })}
      status={rowStatus()?.id === invitation.id ? rowStatus()?.text : undefined}
      action={
        <>
          <Show when={canInvite()}>
            <ResendInvitation
              organizationId={id}
              invitation={invitation}
              disabled={waiting()}
              onPending={setBusy}
              onSent={() => {
                forget()
                setRowStatus({
                  id: invitation.id,
                  text: t('organizationInvitations.row.resent', { email: invitation.email })
                })
                reread()
              }}
              onFailure={(failure) => {
                forget()
                setRowFailure({ id: invitation.id, failure })
              }}
            />
          </Show>
          <Show when={canRevoke()}>
            <RevokeInvitation
              invitation={invitation}
              disabled={waiting()}
              onPending={setBusy}
              onRevoked={() => {
                forget()
                setSectionStatus(t('organizationInvitations.row.revoked', { email: invitation.email }))
                reread()
              }}
              onFailure={(failure) => {
                forget()
                setRowFailure({ id: invitation.id, failure })
              }}
            />
          </Show>
        </>
      }
      panel={
        <Show when={rowFailure()?.id === invitation.id ? rowFailure() : undefined}>
          {(failed) => <InvitationFailure failure={failed().failure} />}
        </Show>
      }
    />
  )

  return (
    <Show when={loaded()}>
      {(data) => (
        <SettingsSection
          title={t('organizationInvitations.section.title')}
          description={t('organizationInvitations.section.description', { name: current.organization.name })}
          status={sectionStatus()}
        >
          <Show when={canInvite()}>
            <SettingsRow
              icon="plus"
              title={t('organizationInvitations.invite.title')}
              description={t('organizationInvitations.invite.description', { name: current.organization.name })}
              status={inviteStatus()}
              action={
                <PanelButton panels={props.panels} panel="invite" onOpen={forget} disabled={busy()}>
                  {t('organizationInvitations.invite.open')}
                </PanelButton>
              }
              panel={
                <Show when={props.panels.isOpen('invite')}>
                  <SettingsPanel label={t('organizationInvitations.invite.open')}>
                    <InvitePeopleForm
                      organizationId={id}
                      roles={data().choices}
                      held={current.membership.permissions}
                      memberEmails={new Set(data().team.map((member) => member.email.toLowerCase()))}
                      onInvited={(email) => {
                        setInviteStatus(t('organizationInvitations.form.sent', { email }))
                        props.panels.close()
                        reread()
                      }}
                      onCancel={props.panels.close}
                    />
                  </SettingsPanel>
                </Show>
              }
            />
          </Show>
          <For each={data().list}>{rowOf}</For>
          <Show when={data().list.length === 0}>
            <p class="p-4 text-sm text-muted-foreground sm:px-5">{t('organizationInvitations.section.empty')}</p>
          </Show>
        </SettingsSection>
      )}
    </Show>
  )
}
