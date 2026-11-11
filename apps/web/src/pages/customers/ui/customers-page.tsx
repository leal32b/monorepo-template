import { type Customer, type CustomerList, type CustomerStatus, customerPageSize } from '@repo/contracts'
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
  PanelButton,
  SegmentedControl
} from '@repo/ui'
import { createEffect, createSignal, For, Match, Show, Switch } from 'solid-js'
import { customersQuery } from '#entities/customers'
import { useOrganization } from '#entities/organizations'
import { ArchiveCustomerButton, CustomerForm, DeleteCustomerForm } from '#features/customers/manage-customers'
import { createRead, readAgain, updateRead, useApi } from '#shared/api'
import { useI18n } from '#shared/config'
import { formatDate } from '#shared/lib'
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
  const customers = customersQuery(api)
  const panels = createPanels()
  const [status, setStatus] = createSignal<CustomerStatus>('active')
  const [search, setSearch] = createSignal('')
  const [typed, setTyped] = createSignal('')
  const [page, setPage] = createSignal(1)
  const [rowStatus, setRowStatus] = createSignal<{ customer: string; text: string }>()
  const [sectionStatus, setSectionStatus] = createSignal<string>()

  const key = () => customers.keyFor(id, status(), search(), page())
  const list = createRead(() => customers(id, status(), search(), page()), key)
  const pages = (loaded: CustomerList) => Math.max(1, Math.ceil(loaded.total / customerPageSize))

  const canAdd = () => current.can('customer', 'create')
  const canEdit = () => current.can('customer', 'update')
  const canDelete = () => current.can('customer', 'delete')

  // A page that emptied because its last customer left (deleted, archived) gives way to the one before it.
  createEffect(() => {
    const loaded = list()
    if (loaded && loaded.items.length === 0 && page() > 1) setPage(page() - 1)
  })

  const forget = () => {
    setRowStatus(undefined)
    setSectionStatus(undefined)
  }
  const show = (next: CustomerStatus) => {
    panels.dismiss()
    forget()
    setStatus(next)
    setPage(1)
  }
  const searchFor = (event: SubmitEvent) => {
    event.preventDefault()
    panels.dismiss()
    forget()
    setSearch(typed().trim())
    setPage(1)
  }
  /** The customer left this list (archived, restored, deleted, or already gone): said below the section. */
  const left = (text: string) => {
    panels.dismiss()
    setSectionStatus(text)
    readAgain(key())
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
      status={rowStatus()?.customer === customer.id ? rowStatus()?.text : undefined}
      action={
        <>
          <Show when={canEdit()}>
            <PanelButton panels={panels} panel={`edit:${customer.id}`} onOpen={forget}>
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
              onRefused={(text) => setRowStatus({ customer: customer.id, text })}
            />
          </Show>
          <Show when={canDelete() && customer.archivedAt !== null}>
            <PanelButton panels={panels} panel={`delete:${customer.id}`} onOpen={forget}>
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
                  updateRead<CustomerList>(key(), (loaded) => ({
                    ...loaded,
                    items: loaded.items.map((item) => (item.id === saved.id ? saved : item))
                  }))
                  setRowStatus({ customer: saved.id, text: t('customers.saved', { name: saved.name }) })
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
    search() !== ''
      ? {
          icon: 'search' as const,
          title: t('customers.empty.noResultsTitle'),
          description: t('customers.empty.noResults', { search: search() })
        }
      : status() === 'archived'
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
    <Show when={list()}>
      {(loaded) => (
        <div class="flex flex-col gap-6">
          <div class="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <form noValidate onSubmit={searchFor} class="flex items-end gap-2 sm:flex-1">
              <Field
                class="flex-1"
                label={t('customers.search.label')}
                name="search"
                type="search"
                autocomplete="off"
                value={typed()}
                onChange={setTyped}
              />
              <Button type="submit" variant="secondary">
                {t('customers.search.submit')}
              </Button>
            </form>
            <SegmentedControl
              label={t('customers.filter.label')}
              value={status()}
              onChange={(value) => show(value as CustomerStatus)}
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
            status={sectionStatus()}
          >
            <Show when={canAdd() && status() === 'active'}>
              <ListRow
                icon="plus"
                title={t('customers.add.title')}
                description={t('customers.add.description')}
                action={
                  <PanelButton panels={panels} panel="add" onOpen={forget}>
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
                          setSectionStatus(t('customers.saved', { name: saved.name }))
                          readAgain(key())
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
          <Show when={pages(loaded()) > 1}>
            <nav class="flex items-center justify-between gap-3" aria-label={t('customers.section.title')}>
              <Button variant="secondary" disabled={page() <= 1} onClick={() => setPage(page() - 1)}>
                {t('customers.pager.previous')}
              </Button>
              <p class="text-sm text-muted-foreground">
                {t('customers.pager.page', { page: loaded().page, pages: pages(loaded()) })}
              </p>
              <Button variant="secondary" disabled={page() >= pages(loaded())} onClick={() => setPage(page() + 1)}>
                {t('customers.pager.next')}
              </Button>
            </nav>
          </Show>
        </div>
      )}
    </Show>
  )
}
