import type { Customer, CustomerStatus } from '@repo/contracts'
import {
  Avatar,
  Badge,
  Button,
  createPanels,
  EmptyState,
  Field,
  ListPanel,
  ListRow,
  ListSection,
  Pager,
  PanelButton,
  SegmentedControl
} from '@repo/ui'
import { For, Match, Show, Switch } from 'solid-js'
import { customersQuery } from '#entities/customers'
import { useOrganization } from '#entities/organizations'
import { ArchiveCustomerButton, CustomerForm, DeleteCustomerForm } from '#features/customers/manage-customers'
import { useApi } from '#shared/api'
import { useI18n } from '#shared/config'
import { createList, createListStatus, formatDate } from '#shared/lib'
import { ReadFailure } from '#shared/ui'
import { AppShell } from '#widgets/app-shell'

/**
 * `/:orgSlug/customers`: the organization's customers (ADR 0044), the reference screen every module of a
 * product is copied from. Anyone with `customer:read` sees the list; what each row offers follows the rest
 * of what the caller holds. A customer who is archived leaves the Active list and waits in Archived, where
 * it can be restored or deleted for good. One form opens at a time on the whole screen, inline below its row;
 * a customer who leaves the list is said below the section, which takes focus.
 */
export function CustomersPage() {
  const { t } = useI18n()
  const current = useOrganization()

  return (
    <AppShell title={t('customers.title')}>
      <Show
        when={current.can('customer', 'read')}
        fallback={
          <EmptyState
            icon="customers"
            title={t('customers.noAccess.title')}
            description={t('customers.noAccess.description', { name: current.organization.name })}
          />
        }
      >
        <ReadFailure message={t('customers.unavailable')}>
          <Customers />
        </ReadFailure>
      </Show>
    </AppShell>
  )
}

function Customers() {
  const { t, locale } = useI18n()
  const api = useApi()
  const current = useOrganization()
  const id = current.organization.id
  const panels = createPanels()
  const status = createListStatus(panels)
  const list = createList({
    query: customersQuery(api),
    args: ({ filter, search, page }) => [id, filter, search, page],
    filter: 'active' as CustomerStatus,
    onChange: () => {
      panels.dismiss()
      status.forget()
    }
  })

  const canAdd = () => current.can('customer', 'create')
  const canEdit = () => current.can('customer', 'update')
  const canDelete = () => current.can('customer', 'delete')

  /** The customer left this list (archived, restored, deleted, or already gone): said below the section. */
  const left = (text: string) => {
    status.left(text)
    list.again()
  }
  const changed = (text: string) => () => left(t(text as 'customers.errors.gone'))
  const stale = (kind: 'gone' | 'changed') => left(t(`customers.errors.${kind}`))

  const description = (customer: Customer) =>
    [customer.company, customer.email, customer.phone].filter(Boolean).join(' · ') || undefined

  const rowOf = (customer: Customer) => (
    <ListRow
      avatar={<Avatar name={customer.name} />}
      title={customer.name}
      badge={
        <Show when={customer.archivedAt}>
          {(day) => (
            <Badge>
              {t('customers.archivedBadge')} · {formatDate(new Date(day()), locale())}
            </Badge>
          )}
        </Show>
      }
      description={description(customer)}
      status={status.row(customer.id)}
      action={
        <>
          <Show when={canEdit()}>
            <PanelButton panels={panels} panel={`edit:${customer.id}`} onOpen={status.forget}>
              {t('customers.actions.edit')}
            </PanelButton>
            <ArchiveCustomerButton
              organizationId={id}
              customer={customer}
              mode={customer.archivedAt === null ? 'archive' : 'restore'}
              disabled={panels.open() !== undefined}
              onDone={(done) =>
                left(
                  t(done.archivedAt === null ? 'customers.archive.restored' : 'customers.archive.archived', {
                    name: done.name
                  })
                )
              }
              onChanged={changed('customers.errors.changed')}
              onRefused={(text) => status.sayRow(customer.id, text)}
            />
          </Show>
          <Show when={canDelete() && customer.archivedAt !== null}>
            <PanelButton panels={panels} panel={`delete:${customer.id}`} onOpen={status.forget}>
              {t('customers.actions.delete')}
            </PanelButton>
          </Show>
        </>
      }
      panel={
        <Switch>
          <Match when={panels.isOpen(`edit:${customer.id}`)}>
            <ListPanel label={t('customers.actions.edit')}>
              <CustomerForm
                organizationId={id}
                customer={customer}
                onSaved={(saved) => {
                  list.draw((loaded) => ({
                    ...loaded,
                    items: loaded.items.map((item) => (item.id === saved.id ? saved : item))
                  }))
                  status.sayRow(saved.id, t('customers.saved', { name: saved.name }))
                  panels.close()
                }}
                onStale={stale}
                onCancel={panels.close}
              />
            </ListPanel>
          </Match>
          <Match when={panels.isOpen(`delete:${customer.id}`)}>
            <ListPanel label={t('customers.actions.delete')}>
              <DeleteCustomerForm
                organizationId={id}
                customer={customer}
                onDeleted={() => left(t('customers.remove.removed', { name: customer.name }))}
                onChanged={changed('customers.errors.changed')}
                onCancel={panels.close}
              />
            </ListPanel>
          </Match>
        </Switch>
      }
    />
  )

  const emptyOf = () =>
    list.search() !== ''
      ? {
          icon: 'search' as const,
          title: t('customers.empty.noResultsTitle'),
          description: t('customers.empty.noResults', { search: list.search() })
        }
      : list.filter() === 'archived'
        ? {
            icon: 'customers' as const,
            title: t('customers.empty.archivedTitle'),
            description: t('customers.empty.archivedDescription')
          }
        : {
            icon: 'customers' as const,
            title: t('customers.empty.title'),
            description: t('customers.empty.description')
          }

  return (
    <Show when={list.loaded()}>
      {(loaded) => (
        <div class="flex flex-col gap-6">
          <div class="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <form
              noValidate
              onSubmit={(event) => {
                event.preventDefault()
                list.find()
              }}
              class="flex items-end gap-2 sm:flex-1"
            >
              <Field
                class="flex-1"
                label={t('customers.search.label')}
                name="search"
                type="search"
                autocomplete="off"
                value={list.typed()}
                onChange={list.setTyped}
              />
              <Button type="submit" variant="secondary">
                {t('customers.search.submit')}
              </Button>
            </form>
            <SegmentedControl
              label={t('customers.filter.label')}
              value={list.filter()}
              onChange={(value) => list.show(value as CustomerStatus)}
              options={[
                { value: 'active', label: t('customers.filter.active') },
                { value: 'archived', label: t('customers.filter.archived') }
              ]}
            />
          </div>
          <ListSection
            title={t('customers.section.title')}
            description={t(
              canAdd() || canEdit() || canDelete() ? 'customers.section.description' : 'customers.section.readOnly',
              {
                name: current.organization.name
              }
            )}
            status={status.section()}
          >
            <Show when={canAdd() && list.filter() === 'active'}>
              <ListRow
                icon="plus"
                title={t('customers.add.title')}
                description={t('customers.add.description')}
                action={
                  <PanelButton panels={panels} panel="add" onOpen={status.forget}>
                    {t('customers.add.go')}
                  </PanelButton>
                }
                panel={
                  <Show when={panels.isOpen('add')}>
                    <ListPanel label={t('customers.add.title')}>
                      <CustomerForm
                        organizationId={id}
                        onSaved={(saved) => {
                          panels.close()
                          status.saySection(t('customers.saved', { name: saved.name }))
                          list.again()
                        }}
                        onStale={stale}
                        onCancel={panels.close}
                      />
                    </ListPanel>
                  </Show>
                }
              />
            </Show>
            <Show
              when={loaded().items.length > 0}
              fallback={
                <EmptyState icon={emptyOf().icon} title={emptyOf().title} description={emptyOf().description} />
              }
            >
              <For each={loaded().items}>{rowOf}</For>
            </Show>
          </ListSection>
          <Show when={list.pages() > 1}>
            <Pager
              label={t('customers.section.title')}
              previousLabel={t('customers.pager.previous')}
              nextLabel={t('customers.pager.next')}
              summary={t('customers.pager.page', { page: loaded().page, pages: list.pages() })}
              hasPrevious={list.hasPrevious()}
              hasNext={list.hasNext()}
              onPrevious={list.previous}
              onNext={list.next}
            />
          </Show>
        </div>
      )}
    </Show>
  )
}
