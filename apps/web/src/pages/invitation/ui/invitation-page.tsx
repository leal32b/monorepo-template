import type { Invitation } from '@repo/contracts'
import { Button, buttonVariants, cn, linkClass } from '@repo/ui'
import { A, useLocation, useNavigate, useParams } from '@solidjs/router'
import { createResource, type JSX, Match, Show, Switch } from 'solid-js'
import { getInvitation, rememberOrganization, useOrganizations } from '#entities/organizations'
import { useSession } from '#entities/sessions'
import { AnswerInvitation } from '#features/organizations/answer-invitation'
import { createSignOut } from '#features/sign-out'
import { ApiError, useApi } from '#shared/api'
import { useI18n } from '#shared/config'
import { AuthFailureAlert } from '#shared/ui'
import { ShellSkeleton } from '#widgets/app-shell'
import { EntryLayout } from '#widgets/entry-layout'

/** A link that is the screen's one action, drawn as its primary button. */
const primaryLink = cn(buttonVariants({ variant: 'primary' }), 'w-full')

/** The states that end the invitation, each with its own title and what to do next. */
const closed = { expired: 'expired', declined: 'declined', withdrawn: 'withdrawn' } as const

/**
 * `/invitations/:id`, the link of the invitation email (ADR 0033, D5). A visitor signs in or creates an
 * account first and comes back here (the session guard and `next`). The API says what became of the
 * invitation, so every case says what to do: open, it is accepted or declined here; accepted, it opens
 * the organization; expired, declined or withdrawn, it names who to ask; sent to another address, it
 * offers to sign in with that one and come back. Accepting opens the organization, remembered on the
 * device; an invitation that closed while the screen was open is read again.
 */
export function InvitationPage() {
  const api = useApi()
  const { t, locale } = useI18n()
  const params = useParams<{ id: string }>()
  const navigate = useNavigate()
  const location = useLocation()
  const session = useSession()
  const organizations = useOrganizations()
  const [invitation, { refetch, mutate }] = createResource(
    () => params.id,
    (id) => getInvitation(api, id)
  )

  const signOut = createSignOut(() =>
    navigate(`/login?next=${encodeURIComponent(location.pathname)}`, { replace: true })
  )
  const failedWith = (status: number) => invitation.error instanceof ApiError && invitation.error.status === status

  const accepted = (current: Invitation) => {
    rememberOrganization(current.organizationSlug)
    organizations.refetch()
    navigate(`/${current.organizationSlug}`, { replace: true })
  }

  const names = (current: Invitation) => ({ organization: current.organizationName, inviter: current.inviterName })
  const date = (current: Invitation) =>
    new Intl.DateTimeFormat(locale(), { dateStyle: 'long' }).format(new Date(current.expiresAt))

  /** "Signed in as …" and the way to another account, for whoever opened the link in the wrong one. */
  const otherAccount = (
    <>
      {t('invitation.signedInAs', { email: session.email })}{' '}
      <button type="button" class={linkClass} disabled={signOut.pending()} onClick={() => signOut.signOut()}>
        {t('invitation.switchAccount')}
      </button>
    </>
  )
  const signOutFailure = <Show when={signOut.failure()}>{(failure) => <AuthFailureAlert failure={failure()} />}</Show>
  const toStart = (
    <A href="/" class={primaryLink}>
      {t('invitation.continue')}
    </A>
  )
  const ended = (title: string, description: string, action: JSX.Element = toStart) => (
    <EntryLayout title={title} description={description}>
      {action}
    </EntryLayout>
  )

  return (
    <Switch fallback={<ShellSkeleton />}>
      <Match when={failedWith(404)}>
        {ended(t('invitation.notFound.title'), t('invitation.notFound.description'))}
      </Match>
      <Match when={failedWith(403)}>
        <EntryLayout
          title={t('invitation.otherAccount.title')}
          description={t('invitation.otherAccount.description', { email: session.email })}
        >
          <div class="flex flex-col gap-4">
            <Button variant="primary" class="w-full" disabled={signOut.pending()} onClick={() => signOut.signOut()}>
              {t('invitation.otherAccount.switch')}
            </Button>
            {signOutFailure}
          </div>
        </EntryLayout>
      </Match>
      <Match when={invitation.error}>
        {ended(
          t('invitation.unavailable.title'),
          t('invitation.unavailable.description'),
          <Button variant="primary" class="w-full" onClick={() => void refetch()}>
            {t('invitation.unavailable.retry')}
          </Button>
        )}
      </Match>
      <Match when={invitation.state === 'ready' && invitation()}>
        {(current) => (
          <Switch>
            <Match when={current().status === 'pending'}>
              <EntryLayout
                title={t('invitation.pending.title', names(current()))}
                description={t('invitation.pending.description', { ...names(current()), date: date(current()) })}
                footer={otherAccount}
              >
                <div class="flex flex-col gap-4">
                  <AnswerInvitation
                    invitationId={current().id}
                    organizationName={current().organizationName}
                    onAnswered={(answer) =>
                      answer === 'accepted' ? accepted(current()) : mutate({ ...current(), status: 'declined' })
                    }
                    onGone={() => void refetch()}
                  />
                  {signOutFailure}
                </div>
              </EntryLayout>
            </Match>
            <Match when={current().status === 'accepted' && current().member}>
              {ended(
                t('invitation.accepted.title', names(current())),
                t('invitation.accepted.description'),
                <A href={`/${current().organizationSlug}`} class={primaryLink}>
                  {t('invitation.accepted.open', names(current()))}
                </A>
              )}
            </Match>
            <Match when={current().status === 'accepted'}>
              {ended(t('invitation.used.title'), t('invitation.used.description', names(current())))}
            </Match>
            <Match when={closed[current().status as keyof typeof closed]}>
              {(status) =>
                ended(t(`invitation.${status()}.title`), t(`invitation.${status()}.description`, names(current())))
              }
            </Match>
          </Switch>
        )}
      </Match>
    </Switch>
  )
}
