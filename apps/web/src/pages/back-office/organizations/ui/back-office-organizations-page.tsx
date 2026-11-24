import type { BackOfficeOrganization } from '@repo/contracts'
import { Avatar, buttonVariants, EmptyState, ListRow, ListSection, ListToolbar } from '@repo/ui'
import { A } from '@solidjs/router'
import { For, Show } from 'solid-js'
import { backOfficeOrganizationsQuery, StatusBadge } from '#entities/operators'
import { useApi } from '#shared/api'
import { useI18n } from '#shared/config'
import { createList, formatDate } from '#shared/lib'
import { ListPager } from '#shared/ui'
import { BackOfficeScreen } from '#widgets/back-office-frame'

/**
 * `/admin/organizations`: every organization, newest first, searched by name, address or owner's email
 * (ADR 0077), each with its plan's state, its owner and its size, and the way to its page.
 */
export function BackOfficeOrganizationsPage() {
  const { t } = useI18n()
  return (
    <BackOfficeScreen title={t('backOffice.organizations.title')} unavailable={t('backOffice.unavailable')}>
      <Organizations />
    </BackOfficeScreen>
  )
}

function Organizations() {
  const { t, locale } = useI18n()
  const api = useApi()
  const list = createList({ query: backOfficeOrganizationsQuery(api), args: ({ search, page }) => [search, page] })

  const members = (count: number) =>
    count === 1 ? t('backOffice.organizations.row.oneMember') : t('backOffice.organizations.row.members', { count })
  const description = (organization: BackOfficeOrganization) =>
    [
      organization.owner === null
        ? t('backOffice.organizations.row.noOwner')
        : t('backOffice.organizations.row.owner', organization.owner),
      t('backOffice.organizations.row.details', {
        slug: organization.slug,
        members: members(organization.members),
        date: formatDate(new Date(organization.createdAt), locale())
      })
    ].join(' · ')

  return (
    <Show when={list.loaded()}>
      {(loaded) => (
        <div class="flex flex-col gap-6">
          <ListToolbar
            searchLabel={t('backOffice.organizations.search')}
            searchButton={t('actions.find')}
            searchValue={list.typed()}
            onSearchInput={list.setTyped}
            onSearch={list.find}
          />
          <Show
            when={loaded().items.length > 0}
            fallback={
              <EmptyState
                icon={list.search() === '' ? 'organization' : 'search'}
                title={t(
                  list.search() === ''
                    ? 'backOffice.organizations.empty.title'
                    : 'backOffice.organizations.empty.noResultsTitle'
                )}
                description={
                  list.search() === ''
                    ? t('backOffice.organizations.empty.description')
                    : t('backOffice.organizations.empty.noResults', { search: list.search() })
                }
              />
            }
          >
            <ListSection
              title={t('backOffice.organizations.section.title')}
              description={t('backOffice.organizations.section.description')}
            >
              <For each={loaded().items}>
                {(organization) => (
                  <ListRow
                    avatar={<Avatar name={organization.name} shape="square" />}
                    title={organization.name}
                    badge={<StatusBadge subscription={organization.subscription} />}
                    description={description(organization)}
                    action={
                      <A
                        href={`/admin/organizations/${encodeURIComponent(organization.id)}`}
                        class={buttonVariants({ variant: 'secondary' })}
                        aria-label={`${t('backOffice.organizations.open')}: ${organization.name}`}
                      >
                        {t('backOffice.organizations.open')}
                      </A>
                    }
                  />
                )}
              </For>
            </ListSection>
          </Show>
          <ListPager label={t('backOffice.organizations.title')} list={list} />
        </div>
      )}
    </Show>
  )
}
