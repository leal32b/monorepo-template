import { Alert, Avatar, Link, ListPanel, ListRow, ListSection, ListSkeleton } from '@repo/ui'
import { useNavigate, useSearchParams } from '@solidjs/router'
import { Show, Suspense } from 'solid-js'
import { accountDeletionQuery } from '#entities/accounts'
import { useSession } from '#entities/sessions'
import { ConfirmAccountDeletionForm } from '#features/delete-account'
import { createRead, useApi } from '#shared/api'
import { useI18n } from '#shared/config'
import { ReadFailure } from '#shared/ui'
import { AppShell } from '#widgets/app-shell'

/**
 * `/settings/delete-account?token=`: where the emailed link lands (ADR 0049). Opening it deletes nothing:
 * the screen says once more what goes, and only its button deletes the account. Someone signed out signs
 * in first and comes back here, as on every screen behind the session. A deleted account leaves for the
 * sign-in, which says so.
 */
export function DeleteAccountPage() {
  const { t } = useI18n()
  const [params] = useSearchParams()
  const token = () => (typeof params.token === 'string' && params.token !== '' ? params.token : undefined)

  return (
    <AppShell title={t('accountDeletion.title')}>
      <Show
        when={token()}
        fallback={
          <Alert variant="error" action={<Link href="/settings/profile">{t('accountDeletion.confirm.profile')}</Link>}>
            {t('accountDeletion.confirm.expired')}
          </Alert>
        }
      >
        {(current) => (
          <ReadFailure message={t('accountDeletion.unavailable')}>
            <Suspense fallback={<ListSkeleton label={t('accountDeletion.loading')} rows={1} />}>
              <Confirmation token={current()} />
            </Suspense>
          </ReadFailure>
        )}
      </Show>
    </AppShell>
  )
}

/** The confirmation once read: whose account it is, what goes, and the button. */
function Confirmation(props: { token: string }) {
  const { t } = useI18n()
  const api = useApi()
  const navigate = useNavigate()
  const user = useSession()
  const query = accountDeletionQuery(api)
  const plan = createRead(() => query(), query.keyFor())

  return (
    <Show when={plan()}>
      {(loaded) => (
        <ListSection title={t('accountDeletion.confirm.title')} description={t('accountDeletion.confirm.description')}>
          <ListRow
            avatar={<Avatar name={user.name} />}
            title={user.name}
            description={user.email}
            panel={
              <ListPanel label={t('accountDeletion.confirm.title')}>
                <ConfirmAccountDeletionForm
                  token={props.token}
                  plan={loaded()}
                  onDeleted={() => navigate('/login?deleted=1', { replace: true })}
                  onCancel={() => navigate('/settings/profile')}
                />
              </ListPanel>
            }
          />
        </ListSection>
      )}
    </Show>
  )
}
