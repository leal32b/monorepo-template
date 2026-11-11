import type { AccountDeletion } from '@repo/contracts'
import { Avatar, createPanels, Link, ListPanel, ListRow, ListSection, ListSkeleton, PanelButton } from '@repo/ui'
import { createSignal, For, Show, Suspense } from 'solid-js'
import { accountDeletionQuery } from '#entities/accounts'
import { useSession } from '#entities/sessions'
import { RequestAccountDeletionForm } from '#features/delete-account'
import { createRead, readAgain, useApi } from '#shared/api'
import { useI18n } from '#shared/config'
import { ReadFailure } from '#shared/ui'
import { AppShell } from '#widgets/app-shell'

/**
 * `/settings/profile`: who the user is, as the app and its emails show it, and the deletion of the account
 * (ADR 0049). What deleting it would do is read under a boundary of its own, so the details above never
 * wait for it; while it is read the first time, a placeholder holds its place.
 */
export function ProfilePage() {
  const { t } = useI18n()
  const user = useSession()

  return (
    <AppShell title={t('profile.title')}>
      <ListSection title={t('profile.details.title')} description={t('profile.details.description')}>
        <ListRow icon="profile" title={t('profile.details.name')} description={user.name} />
        <ListRow icon="mail" title={t('profile.details.email')} description={user.email} />
      </ListSection>
      <ReadFailure message={t('accountDeletion.unavailable')}>
        <Suspense fallback={<ListSkeleton label={t('accountDeletion.loading')} rows={1} />}>
          <AccountDeletionSection />
        </Suspense>
      </ReadFailure>
    </AppShell>
  )
}

/**
 * Deleting the account: an organization where the user is the only owner beside other members blocks it,
 * each one in a row with the way out; otherwise the row opens the form that emails the link to confirm.
 */
function AccountDeletionSection() {
  const { t } = useI18n()
  const api = useApi()
  const user = useSession()
  const query = accountDeletionQuery(api)
  const plan = createRead(() => query(), query.keyFor())
  const panels = createPanels<'delete'>()
  const [status, setStatus] = createSignal<string>()
  const blocked = (loaded: AccountDeletion) =>
    loaded.organizations.filter((organization) => organization.outcome === 'blocked')

  return (
    <Show when={plan()}>
      {(loaded) => (
        <ListSection
          title={t('accountDeletion.title')}
          description={t('accountDeletion.description')}
          status={status()}
        >
          <For each={blocked(loaded())}>
            {(organization) => (
              <ListRow
                avatar={<Avatar name={organization.name} shape="square" />}
                title={t('accountDeletion.blocked.title', { name: organization.name })}
                description={t('accountDeletion.blocked.description')}
                action={<Link href={`/${organization.slug}/settings/members`}>{t('accountDeletion.blocked.go')}</Link>}
              />
            )}
          </For>
          <ListRow
            icon="warning"
            title={t('accountDeletion.row')}
            description={t('accountDeletion.rowDescription')}
            action={
              <Show when={blocked(loaded()).length === 0}>
                <PanelButton panels={panels} panel="delete" onOpen={() => setStatus(undefined)}>
                  {t('accountDeletion.open')}
                </PanelButton>
              </Show>
            }
            panel={
              <Show when={panels.isOpen('delete')}>
                <ListPanel label={t('accountDeletion.open')}>
                  <RequestAccountDeletionForm
                    plan={loaded()}
                    email={user.email}
                    onSent={() => {
                      panels.close()
                      setStatus(t('accountDeletion.request.sent', { email: user.email }))
                    }}
                    onBlocked={() => {
                      panels.close()
                      readAgain(query.keyFor())
                    }}
                    onCancel={panels.close}
                  />
                </ListPanel>
              </Show>
            }
          />
        </ListSection>
      )}
    </Show>
  )
}
