import {
  builtInRoles,
  type Customer,
  customerPageSize,
  type OrganizationMembership,
  type Permissions
} from '@repo/contracts'
import { fireEvent, screen, waitFor, within } from '@solidjs/testing-library'
import type { Locale } from '#shared/config'
import { membershipOf } from '../../../test-membership'
import { renderOrganizationPage } from '../../../test-organization-page'
import { CustomersPage } from './customers-page'

type Fetch = (input: string, init?: RequestInit) => Promise<Response>
const archivedAt = '2026-11-08T10:00:00.000Z'

const customer = (id: string, name: string, over: Partial<Customer> = {}): Customer => ({
  id,
  name,
  email: null,
  phone: null,
  company: null,
  notes: null,
  createdAt: '2026-11-07T10:00:00.000Z',
  updatedAt: '2026-11-07T10:00:00.000Z',
  archivedAt: null,
  version: 1,
  ...over
})
const problem = (code: string, status: number) =>
  Response.json({ type: `urn:problem:${code}`, title: code, status, code }, { status })

/** The API's customers in memory: lists, filters and pages as it does, and keeps what the screen writes. */
function fakeApi(initial: Customer[], over: { fail?: (method: string, path: string) => Response | undefined } = {}) {
  const db = [...initial]
  const calls: Array<{ method: string; path: string; body: unknown }> = []
  const fetch: Fetch = async (input, init) => {
    const method = init?.method ?? 'GET'
    const url = new URL(input, 'http://localhost')
    const body = init?.body === undefined ? undefined : JSON.parse(String(init.body))
    calls.push({ method, path: url.pathname + url.search, body })
    const refused = over.fail?.(method, url.pathname)
    if (refused) return refused
    const [, , , , , id, action] = url.pathname.split('/')
    if (method === 'GET') {
      const status = url.searchParams.get('status')
      const search = url.searchParams.get('search')?.toLowerCase()
      const page = Number(url.searchParams.get('page'))
      const matching = db
        .filter((c) => (status === 'active') === (c.archivedAt === null))
        .filter((c) => search === undefined || c.name.toLowerCase().includes(search))
      const from = (page - 1) * customerPageSize
      return Response.json({
        items: matching.slice(from, from + customerPageSize),
        total: matching.length,
        page,
        pageSize: customerPageSize
      })
    }
    const at = db.findIndex((c) => c.id === id)
    if (method === 'POST' && id === undefined) {
      const created = customer(`c${db.length + 1}`, (body as { name: string }).name)
      db.push(created)
      return Response.json(created, { status: 201 })
    }
    if (method === 'PUT') {
      const read = body as { version: number }
      db[at] = { ...(db[at] as Customer), ...read, version: read.version + 1 }
      return Response.json(db[at])
    }
    if (method === 'POST' && action === 'archive') {
      db[at] = { ...(db[at] as Customer), archivedAt }
      return Response.json(db[at])
    }
    if (method === 'POST' && action === 'restore') {
      db[at] = { ...(db[at] as Customer), archivedAt: null }
      return Response.json(db[at])
    }
    db.splice(at, 1)
    return new Response(null, { status: 204 })
  }
  return { fetch, calls, db }
}

type Options = {
  held?: Permissions
  locale?: Locale
  api: ReturnType<typeof fakeApi>
  /** The caller's membership, when the test is about the plan: the roles' permissions on trial otherwise. */
  membership?: OrganizationMembership
}

function renderPage({ held = builtInRoles.owner as Permissions, locale = 'en', api, membership }: Options) {
  return renderOrganizationPage({
    page: CustomersPage,
    path: '/customers',
    api: api.fetch,
    locale,
    membership: membership ?? membershipOf(['owner'], held as OrganizationMembership['permissions'])
  })
}

/** The row of a customer: the box around its title, with its buttons. */
const rowOf = async (name: string) =>
  within((await screen.findByText(name, { selector: 'div' })).closest('div.flex-col') as HTMLElement)
const press = (name: string, within_: Pick<typeof screen, 'getByRole'> = screen) =>
  fireEvent.click(within_.getByRole('button', { name }))
const type = (name: string, value: string) =>
  fireEvent.input(screen.getByRole(name === 'Search customers' ? 'searchbox' : 'textbox', { name }), {
    target: { value }
  })
const lastList = (api: ReturnType<typeof fakeApi>) => api.calls.filter((call) => call.method === 'GET').at(-1)?.path

const ada = customer('c1', 'Ada Lovelace', { email: 'ada@example.com', company: 'Engines', phone: '555' })
const grace = customer('c2', 'Grace Hopper')
const oldAlan = customer('c3', 'Alan Turing', { archivedAt })

describe('CustomersPage', () => {
  it('lists the active customers with their details, and what the owner may do', async () => {
    renderPage({ api: fakeApi([ada, grace, oldAlan]) })

    expect(await screen.findByRole('heading', { level: 1, name: 'Customers' })).toBeInTheDocument()
    expect(await screen.findByText('Engines · ada@example.com · 555')).toBeInTheDocument()
    expect(screen.queryByText('Alan Turing')).not.toBeInTheDocument()
    expect(screen.getByText('The people and companies Acme works with.')).toBeInTheDocument()
    const row = await rowOf('Ada Lovelace')
    expect(row.getAllByRole('button').map((button) => button.textContent)).toEqual(['Edit', 'Archive'])
    expect(screen.getByRole('button', { name: 'Add' })).toBeInTheDocument()
  })

  it('asks the first page of the active customers', async () => {
    const api = fakeApi([ada])
    renderPage({ api })

    await screen.findByText('Ada Lovelace')

    expect(lastList(api)).toBe('/api/organizations/org-1/customers?status=active&page=1')
  })

  it('shows a customer with no details by its name alone', async () => {
    renderPage({ api: fakeApi([grace]) })

    expect(await screen.findByText('Grace Hopper')).toBeInTheDocument()
  })

  describe('what the role holds', () => {
    it('lets a reader see the list and nothing else, saying so', async () => {
      renderPage({ held: { customer: ['read'] }, api: fakeApi([ada]) })

      expect(await screen.findByText('Ada Lovelace')).toBeInTheDocument()
      expect(
        screen.getByText('The people and companies Acme works with. You can see them, not change them.')
      ).toBeInTheDocument()
      expect(screen.queryByRole('button', { name: 'Add' })).not.toBeInTheDocument()
      expect(screen.queryByRole('button', { name: 'Edit' })).not.toBeInTheDocument()
      expect(screen.queryByRole('button', { name: 'Archive' })).not.toBeInTheDocument()
    })

    it('says a role without read cannot see customers, and asks the API for none', () => {
      const api = fakeApi([ada])
      renderPage({ held: { customer: ['create'] }, api })

      expect(screen.getByText('You cannot see customers here')).toBeInTheDocument()
      expect(screen.getByText('Your role in Acme does not include them. Ask an owner or an admin.')).toBeInTheDocument()
      expect(api.calls).toEqual([])
    })

    it('offers delete only to who may delete, on an archived customer', async () => {
      renderPage({ held: { customer: ['read', 'update'] }, api: fakeApi([oldAlan]) })
      fireEvent.click(await screen.findByRole('radio', { name: 'Archived' }))

      const row = await rowOf('Alan Turing')

      expect(row.getAllByRole('button').map((button) => button.textContent)).toEqual(['Edit', 'Restore'])
    })

    it('does not offer to add on the archived list', async () => {
      renderPage({ api: fakeApi([oldAlan]) })
      fireEvent.click(await screen.findByRole('radio', { name: 'Archived' }))
      await screen.findByText('Alan Turing')

      expect(screen.queryByRole('button', { name: 'Add' })).not.toBeInTheDocument()
    })
  })

  describe('empty lists', () => {
    it('says there are no customers yet', async () => {
      renderPage({ api: fakeApi([]) })

      expect(await screen.findByText('No customers yet')).toBeInTheDocument()
    })

    it('says nothing is archived', async () => {
      renderPage({ api: fakeApi([ada]) })
      fireEvent.click(await screen.findByRole('radio', { name: 'Archived' }))

      expect(await screen.findByText('Nothing archived')).toBeInTheDocument()
    })

    it('says a search found nobody, with the words searched', async () => {
      renderPage({ api: fakeApi([ada]) })
      await screen.findByText('Ada Lovelace')

      type('Search customers', 'zed')
      press('Find')

      expect(await screen.findByText('No customer found')).toBeInTheDocument()
      expect(screen.getByText(/No customer matches “zed”/)).toBeInTheDocument()
    })
  })

  describe('searching and filtering', () => {
    it('searches on submit, not on every keystroke, from the first page', async () => {
      const api = fakeApi([ada, grace])
      renderPage({ api })
      await screen.findByText('Grace Hopper')
      const before = api.calls.length

      type('Search customers', ' grace ')
      expect(api.calls).toHaveLength(before)
      press('Find')

      await waitFor(() => expect(screen.queryByText('Ada Lovelace')).not.toBeInTheDocument())
      expect(lastList(api)).toBe('/api/organizations/org-1/customers?status=active&page=1&search=grace')
    })

    it('shows the archived customers, with the day they were archived', async () => {
      const api = fakeApi([ada, oldAlan])
      renderPage({ api })
      await screen.findByText('Ada Lovelace')

      fireEvent.click(screen.getByRole('radio', { name: 'Archived' }))

      expect(await screen.findByText('Alan Turing')).toBeInTheDocument()
      expect(screen.getByText(/Archived · Nov 8, 2026/)).toBeInTheDocument()
      expect(lastList(api)).toBe('/api/organizations/org-1/customers?status=archived&page=1')
    })
  })

  describe('paging', () => {
    const many = Array.from({ length: customerPageSize + 5 }, (_, i) =>
      customer(`m${i}`, `Customer ${String(i).padStart(2, '0')}`)
    )

    it('draws no pager for one page', async () => {
      renderPage({ api: fakeApi([ada]) })
      await screen.findByText('Ada Lovelace')

      expect(screen.queryByText(/Page 1 of/)).not.toBeInTheDocument()
    })

    it('moves between pages, with the first and last ends disabled', async () => {
      const api = fakeApi(many)
      renderPage({ api })
      await screen.findByText('Customer 00')

      expect(screen.getByText('Page 1 of 2')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Previous' })).toBeDisabled()
      press('Next')

      expect(await screen.findByText('Customer 25')).toBeInTheDocument()
      expect(lastList(api)).toBe('/api/organizations/org-1/customers?status=active&page=2')
      expect(screen.getByRole('button', { name: 'Next' })).toBeDisabled()
      press('Previous')

      expect(await screen.findByText('Customer 00')).toBeInTheDocument()
    })

    it('goes back a page when the last customer of the last page leaves', async () => {
      const api = fakeApi([...many.slice(0, customerPageSize), customer('last', 'Zed Last')])
      renderPage({ api })
      await screen.findByText('Customer 00')
      press('Next')
      const row = await rowOf('Zed Last')

      press('Archive', row)

      expect(await screen.findByText('Customer 00')).toBeInTheDocument()
      expect(screen.queryByText('Page 2 of 2')).not.toBeInTheDocument()
    })
  })

  describe('adding', () => {
    it('adds a customer from the panel and says so below the section', async () => {
      const api = fakeApi([ada])
      renderPage({ api })
      await screen.findByText('Ada Lovelace')

      press('Add')
      type('Name', 'Katherine Johnson')
      press('Add customer')

      expect(await screen.findByText('Katherine Johnson was saved.')).toBeInTheDocument()
      expect(await screen.findByText('Katherine Johnson')).toBeInTheDocument()
      expect(screen.queryByRole('textbox', { name: 'Name' })).not.toBeInTheDocument()
    })

    it('can be cancelled', async () => {
      renderPage({ api: fakeApi([ada]) })
      await screen.findByText('Ada Lovelace')

      press('Add')
      press('Cancel')

      expect(screen.queryByRole('textbox', { name: 'Name' })).not.toBeInTheDocument()
    })

    it('reads the list again when the API says the organization changed under it', async () => {
      const api = fakeApi([ada], {
        fail: (method) => (method === 'POST' ? problem('customer_not_found', 404) : undefined)
      })
      renderPage({ api })
      await screen.findByText('Ada Lovelace')

      press('Add')
      type('Name', 'Katherine')
      press('Add customer')

      expect(await screen.findByText('This customer no longer exists. The list is up to date now.')).toBeInTheDocument()
    })
  })

  describe('editing', () => {
    it('saves the changes, draws them at once and says so in the row', async () => {
      const api = fakeApi([ada, grace])
      renderPage({ api })
      press('Edit', await rowOf('Ada Lovelace'))

      type('Name', 'Ada King')
      press('Save changes')

      expect(await screen.findByText('Ada King was saved.')).toBeInTheDocument()
      expect(screen.getByText('Ada King')).toBeInTheDocument()
      expect(screen.queryByText('Ada Lovelace')).not.toBeInTheDocument()
    })

    it('keeps one panel open at a time: the other rows’ archive waits', async () => {
      renderPage({ api: fakeApi([ada, grace]) })
      press('Edit', await rowOf('Ada Lovelace'))

      const other = await rowOf('Grace Hopper')
      expect(other.getByRole('button', { name: 'Archive' })).toBeDisabled()
      expect(other.getByRole('button', { name: 'Edit' })).toBeDisabled()
    })

    it('says the customer is gone when it was deleted meanwhile, and reads the list again', async () => {
      const api = fakeApi([ada, grace], {
        fail: (method, path) =>
          method === 'PUT' && path.endsWith('/c1') ? problem('customer_not_found', 404) : undefined
      })
      renderPage({ api })
      press('Edit', await rowOf('Ada Lovelace'))

      press('Save changes')

      expect(await screen.findByText('This customer no longer exists. The list is up to date now.')).toBeInTheDocument()
    })

    it('sends the version it read, and when someone saved first, says so and reads their version', async () => {
      const api = fakeApi([ada, grace], {
        fail: (method) => (method === 'PUT' ? problem('customer_changed', 409) : undefined)
      })
      renderPage({ api })
      press('Edit', await rowOf('Ada Lovelace'))
      const reads = api.calls.filter((call) => call.method === 'GET').length

      type('Name', 'Ada King')
      press('Save changes')

      expect(
        await screen.findByText('Someone changed this customer first. The list is up to date now.')
      ).toBeInTheDocument()
      expect(api.calls.find((call) => call.method === 'PUT')?.body).toMatchObject({ name: 'Ada King', version: 1 })
      await waitFor(() => expect(api.calls.filter((call) => call.method === 'GET').length).toBeGreaterThan(reads))
      expect(screen.queryByRole('textbox', { name: 'Name' })).not.toBeInTheDocument()
    })
  })

  describe('archiving and restoring', () => {
    it('archives with one press: the customer leaves the list and waits in Archived', async () => {
      renderPage({ api: fakeApi([ada, grace]) })

      press('Archive', await rowOf('Ada Lovelace'))

      expect(
        await screen.findByText('Ada Lovelace was archived. You can restore it from the Archived list.')
      ).toBeInTheDocument()
      await waitFor(() => expect(screen.queryByText('Engines · ada@example.com · 555')).not.toBeInTheDocument())
    })

    it('restores an archived customer', async () => {
      renderPage({ api: fakeApi([oldAlan]) })
      fireEvent.click(await screen.findByRole('radio', { name: 'Archived' }))

      press('Restore', await rowOf('Alan Turing'))

      expect(await screen.findByText('Alan Turing is active again.')).toBeInTheDocument()
    })

    it('says a role that does not allow it, in the row', async () => {
      const api = fakeApi([ada], {
        fail: (method) => (method === 'POST' ? problem('permission_denied', 403) : undefined)
      })
      renderPage({ api })

      press('Archive', await rowOf('Ada Lovelace'))

      expect(await screen.findByText('Your role does not allow this.')).toBeInTheDocument()
    })

    it('says someone changed the customer first, and reads the list again', async () => {
      const api = fakeApi([ada], {
        fail: (method) => (method === 'POST' ? problem('customer_already_archived', 409) : undefined)
      })
      renderPage({ api })

      press('Archive', await rowOf('Ada Lovelace'))

      expect(
        await screen.findByText('Someone changed this customer first. The list is up to date now.')
      ).toBeInTheDocument()
    })
  })

  describe('deleting', () => {
    it('asks once, then deletes for good and says so', async () => {
      const api = fakeApi([oldAlan, ada])
      renderPage({ api })
      fireEvent.click(await screen.findByRole('radio', { name: 'Archived' }))

      press('Delete', await rowOf('Alan Turing'))
      expect(
        screen.getByText('Delete Alan Turing for good? Their details and notes cannot be recovered.')
      ).toBeInTheDocument()
      press('Delete customer')

      expect(await screen.findByText('Alan Turing was deleted.')).toBeInTheDocument()
      expect(api.db.map((c) => c.id)).toEqual(['c1'])
    })

    it('can be cancelled, and reads the list again when the customer changed first', async () => {
      const api = fakeApi([oldAlan], {
        fail: (method) => (method === 'DELETE' ? problem('customer_not_archived', 409) : undefined)
      })
      renderPage({ api })
      fireEvent.click(await screen.findByRole('radio', { name: 'Archived' }))
      press('Delete', await rowOf('Alan Turing'))
      press('Cancel')
      expect(screen.queryByText(/for good/)).not.toBeInTheDocument()

      press('Delete', await rowOf('Alan Turing'))
      press('Delete customer')

      expect(
        await screen.findByText('Someone changed this customer first. The list is up to date now.')
      ).toBeInTheDocument()
    })
  })

  describe('when the read fails', () => {
    it('says what could not be read and offers to try again', async () => {
      let failing = true
      const api = fakeApi([ada])
      const inner = api.fetch
      api.fetch = async (input, init) => (failing ? problem('boom', 500) : inner(input, init))
      renderPage({ api })

      expect(await screen.findByText(/We could not load your customers/)).toBeInTheDocument()
      failing = false
      press('Try again')

      expect(await screen.findByText('Ada Lovelace')).toBeInTheDocument()
    })
  })

  it('speaks Portuguese', async () => {
    renderPage({ locale: 'pt-BR', api: fakeApi([ada]) })

    expect(await screen.findByRole('heading', { level: 1, name: 'Clientes' })).toBeInTheDocument()
    expect(await screen.findByRole('button', { name: 'Arquivar' })).toBeInTheDocument()
  })

  describe('the plan (ADR 0063)', () => {
    const onPlan = (
      over: Partial<OrganizationMembership['subscription']>,
      limit: number | null,
      held: Permissions = builtInRoles.owner as Permissions
    ): OrganizationMembership => {
      const membership = membershipOf(['owner'], held as OrganizationMembership['permissions'])
      return {
        ...membership,
        subscription: { ...membership.subscription, status: 'active', plan: 'basic', ...over },
        entitlements: { capabilities: [], limits: { 'customers.max': limit } }
      }
    }
    const addRow = async () => rowOf('Add customer')

    it('holds adding at the plan’s limit, telling the owner why and what to do', async () => {
      renderPage({ api: fakeApi([ada, grace]), membership: onPlan({}, 2) })

      const row = await addRow()
      expect(row.getByRole('button', { name: 'Add' })).toBeDisabled()
      expect(
        row.getByText(
          'Your plan allows 2 active customers. Choose a larger plan, or archive customers you no longer serve.'
        )
      ).toBeInTheDocument()
    })

    it('tells another member how room is made, and the owner of an upgrade on its way when it starts', async () => {
      renderPage({ api: fakeApi([ada, grace]), membership: onPlan({}, 2, builtInRoles.member as Permissions) })

      expect(
        (await addRow()).getByText(
          "This organization's plan allows 2 active customers. Archiving customers you no longer serve frees room; an owner can choose a larger plan."
        )
      ).toBeInTheDocument()
    })

    it('says an upgrade on its way starts when its payment is confirmed', async () => {
      const upgrading = {
        checkout: { kind: 'upgrade' as const, plan: 'pro' as const, amount: { amount: 2000, currency: 'BRL' as const } }
      }
      renderPage({ api: fakeApi([ada, grace]), membership: onPlan(upgrading, 2) })

      expect(
        (await addRow()).getByText(
          'Your plan allows 2 active customers. The upgrade to Pro starts when its payment is confirmed.'
        )
      ).toBeInTheDocument()
    })

    it('offers adding below the limit and with no limit', async () => {
      renderPage({ api: fakeApi([ada, grace]), membership: onPlan({}, null) })

      expect((await addRow()).getByRole('button', { name: 'Add' })).toBeEnabled()
    })

    it('explains a refusal by the limit, keeping what was typed, with the way to the plans', async () => {
      const api = fakeApi([ada], {
        fail: (method, path) =>
          method === 'POST' && path.endsWith('/customers')
            ? Response.json(
                {
                  type: 'urn:problem:plan_limit_reached',
                  title: 'Limit',
                  status: 403,
                  code: 'plan_limit_reached',
                  entitlement: 'customers.max',
                  limit: 1
                },
                { status: 403 }
              )
            : undefined
      })
      const { refresh } = renderPage({ api, membership: onPlan({}, 2) })
      press('Add', await addRow())
      type('Name', 'Linus Torvalds')
      press('Add customer')

      const alert = await screen.findByRole('alert')
      expect(alert).toHaveTextContent(
        'Your plan allows 1 active customers. Choose a larger plan, or archive customers you no longer serve.'
      )
      expect(within(alert).getByRole('link', { name: 'See plans' })).toHaveAttribute('href', '/acme/settings/billing')
      expect(screen.getByRole('textbox', { name: 'Name' })).toHaveValue('Linus Torvalds')
      expect(refresh).toHaveBeenCalled()
    })

    it('says why a customer cannot be restored past the limit', async () => {
      const archived = customer('c3', 'Hedy Lamarr', { archivedAt })
      const api = fakeApi([ada, archived], {
        fail: (_method, path) => (path.endsWith('/restore') ? problem('plan_limit_reached', 403) : undefined)
      })
      renderPage({ api, membership: onPlan({}, 1, builtInRoles.member as Permissions) })
      fireEvent.click(await screen.findByRole('radio', { name: 'Archived' }))
      const row = await rowOf('Hedy Lamarr')
      press('Restore', row)

      expect(
        await row.findByText(
          "This organization's plan allows 1 active customers. Archiving customers you no longer serve frees room; an owner can choose a larger plan."
        )
      ).toBeInTheDocument()
    })

    it('draws its writes disabled while read only, with the reason, and still deletes', async () => {
      const archived = customer('c3', 'Hedy Lamarr', { archivedAt })
      renderPage({ api: fakeApi([ada, archived]), membership: onPlan({ access: 'read-only' }, null) })

      const add = await addRow()
      expect(add.getByRole('button', { name: 'Add' })).toBeDisabled()
      expect(add.getByText('Read only until the plan is paid')).toBeInTheDocument()
      const row = await rowOf('Ada Lovelace')
      expect(row.getByRole('button', { name: 'Edit' })).toBeDisabled()
      expect(row.getByRole('button', { name: 'Archive' })).toBeDisabled()
      expect(row.getByText('Read only until the plan is paid')).toBeInTheDocument()

      fireEvent.click(screen.getByRole('radio', { name: 'Archived' }))
      const gone = await rowOf('Hedy Lamarr')
      expect(gone.getByRole('button', { name: 'Restore' })).toBeDisabled()
      expect(gone.getByRole('button', { name: 'Delete' })).toBeEnabled()
    })

    it('explains a write refused as read only by a stale screen, and reads the membership again', async () => {
      const api = fakeApi([ada], {
        fail: (method) => (method === 'POST' ? problem('subscription_read_only', 403) : undefined)
      })
      const { refresh } = renderPage({ api, membership: onPlan({}, null, builtInRoles.member as Permissions) })
      press('Add', await addRow())
      type('Name', 'Linus Torvalds')
      press('Add customer')

      const alert = await screen.findByRole('alert')
      expect(alert).toHaveTextContent(
        'This organization is read only until an owner pays. You can still view everything.'
      )
      expect(within(alert).queryByRole('link')).not.toBeInTheDocument()
      expect(refresh).toHaveBeenCalled()
    })
  })
})
