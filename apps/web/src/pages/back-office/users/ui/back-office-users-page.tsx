import type { BackOfficeUser } from '@repo/contracts'
import { Avatar, Badge, EmptyState, ListRow, ListSection, ListToolbar } from '@repo/ui'
import { For, Show } from 'solid-js'
import { backOfficeUsersQuery } from '#entities/operators'
import { useApi } from '#shared/api'
import { useI18n } from '#shared/config'
import { createList, formatDate } from '#shared/lib'
import { ListPager } from '#shared/ui'
import { BackOfficeScreen } from '#widgets/back-office-frame'

/**
 * `/admin/users`: every user, newest first, searched by email or name (ADR 0077), with the last sign-in,
 * whether two-step verification is on, and their organizations.
 */
export function BackOfficeUsersPage() {
  const { t } = useI18n()
  return (
    <BackOfficeScreen title={t('backOffice.users.title')} unavailable={t('backOffice.unavailable')}>
      <Users />
    </BackOfficeScreen>
  )
}

function Users() {
  const { t, locale } = useI18n()
  const api = useApi()
  const list = createList({ query: backOfficeUsersQuery(api), args: ({ search, page }) => [search, page] })

  const description = (user: BackOfficeUser) =>
    [
      user.email,
      user.lastSignInAt === null
        ? t('backOffice.users.row.never')
        : t('backOffice.users.row.lastSignIn', { date: formatDate(new Date(user.lastSignInAt), locale()) }),
      user.organizations.length === 0
        ? t('backOffice.users.row.noOrganization')
        : user.organizations.map((organization) => `${organization.name} (${organization.role})`).join(', ')
    ].join(' · ')

  return (
    <Show when={list.loaded()}>
      {(loaded) => (
        <div class="flex flex-col gap-6">
          <ListToolbar
            searchLabel={t('backOffice.users.search')}
            searchButton={t('actions.find')}
            searchValue={list.typed()}
            onSearchInput={list.setTyped}
            onSearch={list.find}
          />
          <Show
            when={loaded().items.length > 0}
            fallback={
              <EmptyState
                icon={list.search() === '' ? 'users' : 'search'}
                title={t(
                  list.search() === '' ? 'backOffice.users.empty.title' : 'backOffice.users.empty.noResultsTitle'
                )}
                description={
                  list.search() === ''
                    ? t('backOffice.users.empty.description')
                    : t('backOffice.users.empty.noResults', { search: list.search() })
                }
              />
            }
          >
            <ListSection
              title={t('backOffice.users.section.title')}
              description={t('backOffice.users.section.description')}
            >
              <For each={loaded().items}>
                {(user) => (
                  <ListRow
                    avatar={<Avatar name={user.name} />}
                    title={user.name}
                    badge={
                      <Show when={user.twoFactor}>
                        <Badge>{t('backOffice.users.row.twoFactor')}</Badge>
                      </Show>
                    }
                    description={description(user)}
                  />
                )}
              </For>
            </ListSection>
          </Show>
          <ListPager label={t('backOffice.users.title')} list={list} />
        </div>
      )}
    </Show>
  )
}
