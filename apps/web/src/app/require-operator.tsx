import { backOfficeProblems, type OperatorSessionRefusal } from '@repo/contracts'
import { Button } from '@repo/ui'
import { useNavigate } from '@solidjs/router'
import { createResource, Match, type ParentProps, Switch } from 'solid-js'
import { getImpersonation, useImpersonation } from '#entities/impersonations'
import { createSignOut } from '#features/sign-out'
import { NotFoundPage } from '#pages/not-found'
import { ApiError, useApi } from '#shared/api'
import { useI18n } from '#shared/config'
import { ShellSkeleton } from '#widgets/app-shell'
import { BackOfficeFrame } from '#widgets/back-office-frame'
import { EntryLayout } from '#widgets/entry-layout'

/** Why the back office refused the operator's session, from its 403, or `undefined` for any other failure. */
const refusalOf = (error: unknown): OperatorSessionRefusal | undefined =>
  error instanceof ApiError && error.problem?.code === backOfficeProblems.sessionRefused
    ? (error.problem.reason as OperatorSessionRefusal)
    : undefined

/**
 * The screens under `/admin` (ADR 0077). It asks the back office which visit is on, which every operator may
 * ask: a 404, as whoever is not an operator gets, shows "not found", as any address the app does not have; an
 * operator whose session may not open it is told why and signs in again; otherwise the back office's frame.
 */
export function RequireOperator(props: ParentProps) {
  const { t } = useI18n()
  const api = useApi()
  const navigate = useNavigate()
  const impersonation = useImpersonation()
  const [access, { refetch }] = createResource(() =>
    getImpersonation(api).then(({ impersonation: visit }) => {
      impersonation.set(visit)
      return true
    })
  )
  const signOut = createSignOut(() => navigate('/login?next=%2Fadmin', { replace: true }))

  return (
    <Switch fallback={<ShellSkeleton />}>
      <Match when={access.error instanceof ApiError && access.error.status === 404}>
        <NotFoundPage />
      </Match>
      <Match when={refusalOf(access.error)}>
        {(reason) => (
          <EntryLayout title={t('backOffice.refused.title')} description={t(`backOffice.refused.${reason()}`)}>
            <Button variant="primary" class="w-full" disabled={signOut.pending()} onClick={() => signOut.signOut()}>
              {t('backOffice.refused.action')}
            </Button>
          </EntryLayout>
        )}
      </Match>
      <Match when={access.error}>
        <EntryLayout title={t('backOffice.name')} description={t('backOffice.unavailable')}>
          <Button variant="primary" class="w-full" onClick={() => refetch()}>
            {t('actions.retry')}
          </Button>
        </EntryLayout>
      </Match>
      <Match when={access()}>
        <BackOfficeFrame>{props.children}</BackOfficeFrame>
      </Match>
    </Switch>
  )
}
