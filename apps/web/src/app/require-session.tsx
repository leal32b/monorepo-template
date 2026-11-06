import { Button } from '@repo/ui'
import { Navigate, query, useLocation, useNavigate } from '@solidjs/router'
import { createResource, Match, onCleanup, type ParentProps, Suspense, Switch } from 'solid-js'
import { SessionProvider, sessionQuery } from '#entities/sessions'
import { ApiError, ApiProvider, useApi, useAuth, whenUnauthorized } from '#shared/api'
import { useI18n } from '#shared/config'
import { ShellSkeleton } from '#widgets/app-shell'
import { EntryLayout } from '#widgets/entry-layout'
import { PaletteShortcut } from './palette-shortcut'

/**
 * The routes below need a session: it asks Better Auth who is signed in (a visitor is a 200 with
 * nothing, so a page opened without a session logs no error in the console) and gives the answer to the
 * screens, or sends a visitor without a session to sign in, to come back to the same page. Nothing
 * shows at first while it asks, so no screen flashes for someone who is about to be sent away; a slow
 * answer draws the empty frame of the shell, so the page does not jump from blank to full. Below it, any
 * call the API answers with 401, because the session ended meanwhile, sends the user to sign in too.
 *
 * The screens below sit in one `Suspense`. The first time, it draws the shell's frame while what they
 * need comes (a screen's code, the organizations). After that, only a screen's code not loaded yet holds
 * the screen on view: what screens read waits under boundaries of their own (ADR 0038).
 *
 * The session's route asks for it at boot, beside the organizations, and this reads the same answer.
 * Every read cached for the session goes when the user leaves it (signing out, or the session ending).
 */
export function RequireSession(props: ParentProps) {
  const api = useApi()
  const auth = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const { t } = useI18n()
  const read = sessionQuery(auth)
  const [me, { refetch }] = createResource(() => read())
  onCleanup(() => query.clear())

  /**
   * The sign-in, coming back here. An `error` in the address, from a confirmation link that failed,
   * goes to the sign-in apart from the page, so the sign-in can explain it.
   */
  const signIn = () => {
    const search = new URLSearchParams(location.search)
    const error = search.get('error')
    search.delete('error')
    const rest = search.toString()
    const next = encodeURIComponent(location.pathname + (rest ? `?${rest}` : ''))
    return `/login?next=${next}${error ? `&error=${encodeURIComponent(error)}` : ''}`
  }
  const guarded = whenUnauthorized(api, () => navigate(signIn(), { replace: true }))

  return (
    <Switch fallback={<ShellSkeleton />}>
      <Match when={me.error instanceof ApiError && me.error.status === 401}>
        <Navigate href={signIn()} />
      </Match>
      <Match when={me.error}>
        <EntryLayout title={t('session.unavailable.title')} description={t('session.unavailable.description')}>
          <Button variant="primary" class="w-full" onClick={() => refetch()}>
            {t('actions.retry')}
          </Button>
        </EntryLayout>
      </Match>
      <Match when={me.state === 'ready' && me()}>
        {(user) => (
          <ApiProvider client={guarded}>
            <SessionProvider user={user()}>
              <Suspense fallback={<ShellSkeleton />}>{props.children}</Suspense>
              <PaletteShortcut />
            </SessionProvider>
          </ApiProvider>
        )}
      </Match>
    </Switch>
  )
}
