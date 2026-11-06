import type { Invitation } from '@repo/contracts'
import { Button, buttonVariants, FormActions, linkClass } from '@repo/ui'
import { A, useLocation, useNavigate, useParams } from '@solidjs/router'
import { type JSX, Match, Show, Suspense, Switch } from 'solid-js'
import { invitationQuery, rememberOrganization, useOrganizations } from '#entities/organizations'
import { useSession } from '#entities/sessions'
import { AnswerInvitation } from '#features/organizations/answer-invitation'
import { createSignOut } from '#features/sign-out'
import { type ApiError, createRead, readAgain, updateRead, useApi } from '#shared/api'
import { useI18n } from '#shared/config'
import { formatDate } from '#shared/lib'
import { AuthFailureAlert, ReadFailure } from '#shared/ui'
import { AppShell, PageSkeleton, ShellSkeleton } from '#widgets/app-shell'
import { EntryLayout, type EntryLayoutProps, EntrySkeleton } from '#widgets/entry-layout'

/** A link that is the screen's one action, drawn as its primary button. */
const primaryLink = buttonVariants({ variant: 'primary' })

/** The states that end the invitation, each with its own title and what to do next. */
const closed = { expired: 'expired', declined: 'declined', withdrawn: 'withdrawn' } as const

/** The status the API refused an invitation with: the API client fails with an `ApiError`, which has one when it answered. */
const statusOf = (error: unknown) => (error as Partial<ApiError>).status

/**
 * `/invitations/:id`, the link of the invitation email (ADR 0033, D5). A visitor signs in or creates an
 * account first and comes back here (the session guard and `next`). The API says what became of the
 * invitation, so every case says what to do: open, it is accepted or declined here; accepted, it opens
 * the organization; expired, declined or withdrawn, it names who to ask; sent to another address, it
 * offers to sign in with that one and come back. Accepting opens the organization, remembered on the
 * device; an invitation that closed while the screen was open is read again.
 *
 * For someone who has an organization each case is an app screen, in the frame, whose side menu holds the
 * account and the way back; for someone who has none, as after signing up from the email, an entry screen
 * that says who is signed in (ADR 0039). Until the organizations are known, the session's skeleton holds
 * the place. The invitation is read through its query, which its route starts as it opens (ADR 0038); each
 * link draws its screen anew.
 */
export function InvitationPage() {
  const params = useParams<{ id: string }>()

  return (
    <Show when={params.id} keyed>
      {(id) => <InvitationScreen id={id} />}
    </Show>
  )
}

/** The screen of one invitation. */
function InvitationScreen(props: { id: string }) {
  const api = useApi()
  const { t, locale } = useI18n()
  const navigate = useNavigate()
  const location = useLocation()
  const session = useSession()
  const organizations = useOrganizations()
  const framed = organizations.hasOrganization
  const read = invitationQuery(api)
  const key = read.keyFor(props.id)

  const signOut = createSignOut(() =>
    navigate(`/login?next=${encodeURIComponent(location.pathname)}`, { replace: true })
  )

  const accepted = (current: Invitation) => {
    rememberOrganization(current.organizationSlug)
    organizations.refetch()
    navigate(`/${current.organizationSlug}`, { replace: true })
  }

  const names = (current: Invitation) => ({ organization: current.organizationName, inviter: current.inviterName })
  const date = (current: Invitation) => formatDate(new Date(current.expiresAt), locale())

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

  /** A case of the screen, in the app's frame or as an entry screen; the frame's side menu holds the account. */
  const Screen = (screen: EntryLayoutProps) => (
    <Show when={framed()} fallback={<EntryLayout {...screen} />}>
      <AppShell title={screen.title} description={screen.description}>
        {screen.children}
      </AppShell>
    </Show>
  )
  const ended = (title: string, description: string, action: JSX.Element = toStart) => (
    <Screen title={title} description={description}>
      <FormActions>{action}</FormActions>
    </Screen>
  )

  /** What the API would not say about the invitation, each case with what to do. */
  const refused = (error: unknown, retry: () => void) => (
    <Switch
      fallback={ended(
        t('invitation.unavailable.title'),
        t('invitation.unavailable.description'),
        <Button variant="primary" onClick={retry}>
          {t('actions.retry')}
        </Button>
      )}
    >
      <Match when={statusOf(error) === 404}>
        {ended(t('invitation.notFound.title'), t('invitation.notFound.description'))}
      </Match>
      <Match when={statusOf(error) === 403}>
        <Screen
          title={t('invitation.otherAccount.title')}
          description={t('invitation.otherAccount.description', { email: session.email })}
        >
          <div class="flex flex-col gap-4">
            <FormActions>
              <Button variant="primary" disabled={signOut.pending()} onClick={() => signOut.signOut()}>
                {t('invitation.otherAccount.switch')}
              </Button>
            </FormActions>
            {signOutFailure}
          </div>
        </Screen>
      </Match>
    </Switch>
  )

  /** The invitation once read, by what became of it. */
  function Answer() {
    const invitation = createRead(() => read(props.id), key)

    return (
      <Show when={invitation()}>
        {(current) => (
          <Switch>
            <Match when={current().status === 'pending'}>
              <Screen
                title={t('invitation.pending.title', names(current()))}
                description={t('invitation.pending.description', { ...names(current()), date: date(current()) })}
                footer={otherAccount}
              >
                <div class="flex flex-col gap-4">
                  <AnswerInvitation
                    invitationId={current().id}
                    onAnswered={(answer) =>
                      answer === 'accepted'
                        ? accepted(current())
                        : updateRead<Invitation>(key, (open) => ({ ...open, status: 'declined' }))
                    }
                    onGone={() => readAgain(key)}
                  />
                  {signOutFailure}
                </div>
              </Screen>
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
      </Show>
    )
  }

  return (
    <Switch fallback={<ShellSkeleton />}>
      <Match when={framed() !== undefined}>
        <ReadFailure fallback={refused}>
          <Suspense fallback={framed() ? <PageSkeleton /> : <EntrySkeleton />}>
            <Answer />
          </Suspense>
        </ReadFailure>
      </Match>
    </Switch>
  )
}
