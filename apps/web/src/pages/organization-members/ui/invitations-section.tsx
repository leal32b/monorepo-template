import {
  Alert,
  Avatar,
  Badge,
  Button,
  PanelButton,
  type Panels,
  SettingsPanel,
  SettingsRow,
  SettingsSection,
  SettingsSkeleton
} from '@repo/ui'
import { createResource, createSignal, For, Match, Show, Suspense, Switch } from 'solid-js'
import {
  listPendingInvitations,
  type Member,
  type PendingInvitation,
  type Role,
  useOrganization,
  useRoleLabel
} from '#entities/organizations'
import {
  InvitationFailure,
  InvitePeopleForm,
  ResendInvitation,
  RevokeInvitation
} from '#features/organizations/invite-people'
import { type AuthFailure, useAuth } from '#shared/api'
import { useI18n } from '#shared/config'
import { formatDate } from '#shared/lib'

export type InvitationsSectionProps = {
  members: readonly Member[]
  roles: readonly Role[]
  /** The screen's panels: one form open at a time across the people and the invitations. */
  panels: Panels
}

/**
 * The invitations of the organization: a row to invite someone, and the ones still waiting for an answer,
 * each with when it expires, to send again (the way out when the email did not arrive) or to revoke.
 * Whoever may create invitations sees the first, whoever may cancel them sees the second; anyone else does
 * not see the section. The list is read on its own, so it can fail or load again without the people above
 * it going blank; while it is read the first time, a placeholder holds its place. While a form is open anywhere on the screen, every action here waits.
 */
export function InvitationsSection(props: InvitationsSectionProps) {
  const { t, locale } = useI18n()
  const auth = useAuth()
  const current = useOrganization()
  const roleLabel = useRoleLabel()
  const canInvite = () => current.can('invitation', 'create')
  const canRevoke = () => current.can('invitation', 'cancel')
  const canSee = () => canInvite() || canRevoke()
  const [pending, { refetch }] = createResource(
    () => (canSee() ? current.organization.id : undefined),
    (organizationId) => listPendingInvitations(auth, organizationId, new Date())
  )
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
              organizationId={current.organization.id}
              invitation={invitation}
              disabled={waiting()}
              onPending={setBusy}
              onSent={() => {
                forget()
                setRowStatus({
                  id: invitation.id,
                  text: t('organizationInvitations.row.resent', { email: invitation.email })
                })
                void refetch()
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
                void refetch()
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
    <Show when={canSee()}>
      <Suspense fallback={<SettingsSkeleton label={t('appShell.loading')} rows={1} />}>
        <Switch>
          <Match when={pending.error}>
            <Alert variant="error" action={<Button onClick={() => void refetch()}>{t('actions.retry')}</Button>}>
              {t('organizationInvitations.unavailable')}
            </Alert>
          </Match>
          <Match when={pending.latest}>
            {(list) => (
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
                            organizationId={current.organization.id}
                            roles={props.roles}
                            held={current.membership.permissions}
                            memberEmails={new Set(props.members.map((member) => member.email.toLowerCase()))}
                            onInvited={(email) => {
                              setInviteStatus(t('organizationInvitations.form.sent', { email }))
                              props.panels.close()
                              void refetch()
                            }}
                            onCancel={props.panels.close}
                          />
                        </SettingsPanel>
                      </Show>
                    }
                  />
                </Show>
                <For each={list()}>{rowOf}</For>
                <Show when={list().length === 0}>
                  <p class="p-4 text-sm text-muted-foreground sm:px-5">{t('organizationInvitations.section.empty')}</p>
                </Show>
              </SettingsSection>
            )}
          </Match>
        </Switch>
      </Suspense>
    </Show>
  )
}
