import { Button } from '@repo/ui'
import { Navigate, useLocation, useNavigate } from '@solidjs/router'
import { createResource, Match, type ParentProps, Switch } from 'solid-js'
import { getMe, SessionProvider } from '#entities/sessions'
import { ApiError, ApiProvider, useApi, whenUnauthorized } from '#shared/api'
import { useI18n } from '#shared/config'
import { EntryLayout } from '#widgets/entry-layout'

/**
 * The routes below need a session: it asks the API who is signed in and gives the answer to the
 * screens, or sends a visitor without a session to sign in, to come back to the same page. Nothing
 * shows while it asks, so no screen flashes for someone who is about to be sent away. Below it, any
 * call the API answers with 401, because the session ended meanwhile, sends the user to sign in too.
 */
export function RequireSession(props: ParentProps) {
  const api = useApi()
  const location = useLocation()
  const navigate = useNavigate()
  const { t } = useI18n()
  const [me, { refetch }] = createResource(() => getMe(api))

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
    <Switch>
      <Match when={me.error instanceof ApiError && me.error.status === 401}>
        <Navigate href={signIn()} />
      </Match>
      <Match when={me.error}>
        <EntryLayout title={t('session.unavailable.title')} description={t('session.unavailable.description')}>
          <Button variant="primary" class="w-full" onClick={() => refetch()}>
            {t('session.unavailable.retry')}
          </Button>
        </EntryLayout>
      </Match>
      <Match when={me.state === 'ready' && me()}>
        {(user) => (
          <ApiProvider client={guarded}>
            <SessionProvider user={user()}>{props.children}</SessionProvider>
          </ApiProvider>
        )}
      </Match>
    </Switch>
  )
}
