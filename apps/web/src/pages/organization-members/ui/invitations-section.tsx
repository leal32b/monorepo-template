import { Alert, Badge, Button, SettingsRow, SettingsSection } from '@repo/ui'
import { createResource, createSignal, For, Match, Show, Switch } from 'solid-js'
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
import { Panel } from './panel'

/**
 * The invitations of the organization: a row to invite someone, and the ones still waiting for an answer,
 * each with when it expires, to send again (the way out when the email did not arrive) or to revoke.
 * Whoever may create invitations sees the first, whoever may cancel them sees the second; anyone else does
 * not see the section. The list is read on its own, so it can fail or load again without the people above
 * it going blank.
 */
export function InvitationsSection(props: { members: readonly Member[]; roles: readonly Role[] }) {
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
  const [inviting, setInviting] = createSignal(false)
  const [leadStatus, setLeadStatus] = createSignal<string>()
  const [rowStatus, setRowStatus] = createSignal<{ id: string; text: string }>()
  const [rowFailure, setRowFailure] = createSignal<{ id: string; failure: AuthFailure }>()
  const [busy, setBusy] = createSignal(false)

  const dateOf = (date: Date) => new Intl.DateTimeFormat(locale(), { dateStyle: 'medium' }).format(date)
  const forget = () => {
    setRowStatus(undefined)
    setRowFailure(undefined)
  }

  const rowOf = (invitation: PendingInvitation) => (
    <SettingsRow
      letter="@"
      title={invitation.email}
      badge={<For each={invitation.roles}>{(role) => <Badge>{roleLabel(role)}</Badge>}</For>}
      description={t('invitations.expires', { date: dateOf(invitation.expiresAt) })}
      status={rowStatus()?.id === invitation.id ? rowStatus()?.text : undefined}
      action={
        <>
          <Show when={canInvite()}>
            <ResendInvitation
              organizationId={current.organization.id}
              invitation={invitation}
              disabled={busy()}
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
              disabled={busy()}
              onPending={setBusy}
              onRevoked={() => {
                forget()
                setLeadStatus(t('organizationInvitations.row.revoked', { email: invitation.email }))
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
      <Switch>
        <Match when={pending.error}>
          <Alert
            variant="error"
            action={<Button onClick={() => void refetch()}>{t('organizationInvitations.retry')}</Button>}
          >
            {t('organizationInvitations.unavailable')}
          </Alert>
        </Match>
        <Match when={pending.latest}>
          {(list) => (
            <SettingsSection
              title={t('organizationInvitations.section.title')}
              description={t('organizationInvitations.section.description', { name: current.organization.name })}
            >
              <Show when={canInvite()}>
                <SettingsRow
                  icon="plus"
                  title={t('organizationInvitations.invite.title')}
                  description={t('organizationInvitations.invite.description', { name: current.organization.name })}
                  status={leadStatus()}
                  action={
                    <Show when={!inviting()}>
                      <Button
                        onClick={() => {
                          setLeadStatus(undefined)
                          setInviting(true)
                        }}
                      >
                        {t('organizationInvitations.invite.open')}
                      </Button>
                    </Show>
                  }
                  panel={
                    <Show when={inviting()}>
                      <Panel label={t('organizationInvitations.invite.open')}>
                        <InvitePeopleForm
                          organizationId={current.organization.id}
                          roles={props.roles}
                          held={current.membership.permissions}
                          memberEmails={new Set(props.members.map((member) => member.email.toLowerCase()))}
                          onInvited={(email) => {
                            setInviting(false)
                            setLeadStatus(t('organizationInvitations.form.sent', { email }))
                            void refetch()
                          }}
                          onCancel={() => setInviting(false)}
                        />
                      </Panel>
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
    </Show>
  )
}
