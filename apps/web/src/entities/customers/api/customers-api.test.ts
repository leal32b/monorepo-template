import { createApiClient } from '#shared/api'
import {
  archiveCustomer,
  createCustomer,
  deleteCustomer,
  listCustomers,
  restoreCustomer,
  updateCustomer
} from './customers-api'

const customer = {
  id: 'c1',
  name: 'Ada',
  email: null,
  phone: null,
  company: null,
  notes: null,
  createdAt: '2026-11-07T10:00:00.000Z',
  archivedAt: null
}

/** A client whose fetch records what it was asked and answers `response`. */
function clientAnswering(response: () => Response) {
  const fetch = vi.fn(async (_path: string, _init?: RequestInit) => response())
  return { api: createApiClient({ fetch }), fetch }
}
const sentOf = (fetch: ReturnType<typeof clientAnswering>['fetch']) => ({
  path: fetch.mock.calls[0]?.[0],
  method: fetch.mock.calls[0]?.[1]?.method,
  body: fetch.mock.calls[0]?.[1]?.body
})

describe('listCustomers', () => {
  it('asks for the filter and the page, and leaves a search out when there is none', async () => {
    const { api, fetch } = clientAnswering(() => Response.json({ items: [customer], total: 1, page: 2, pageSize: 25 }))

    expect((await listCustomers(api, 'org/1', { status: 'archived', search: '', page: 2 })).items).toHaveLength(1)
    expect(fetch.mock.calls[0]?.[0]).toBe('/api/organizations/org%2F1/customers?status=archived&page=2')
  })

  it('sends a search encoded', async () => {
    const { api, fetch } = clientAnswering(() => Response.json({ items: [], total: 0, page: 1, pageSize: 25 }))

    await listCustomers(api, 'org-1', { status: 'active', search: 'ada & co', page: 1 })

    expect(fetch.mock.calls[0]?.[0]).toBe('/api/organizations/org-1/customers?status=active&page=1&search=ada+%26+co')
  })

  it('fails with the API’s refusal', async () => {
    const { api } = clientAnswering(() => Response.json({ code: 'permission_denied' }, { status: 403 }))

    await expect(listCustomers(api, 'org-1', { status: 'active', search: '', page: 1 })).rejects.toMatchObject({
      status: 403
    })
  })
})

describe('the writes', () => {
  it('creates with a POST of the form’s values', async () => {
    const { api, fetch } = clientAnswering(() => Response.json(customer, { status: 201 }))

    expect(await createCustomer(api, 'org-1', { name: 'Ada' })).toEqual(customer)
    expect(sentOf(fetch)).toEqual({
      path: '/api/organizations/org-1/customers',
      method: 'POST',
      body: '{"name":"Ada"}'
    })
  })

  it('updates with a PUT to the customer', async () => {
    const { api, fetch } = clientAnswering(() => Response.json(customer))

    await updateCustomer(api, 'org-1', 'c/1', { name: 'Ada King' })

    expect(sentOf(fetch)).toEqual({
      path: '/api/organizations/org-1/customers/c%2F1',
      method: 'PUT',
      body: '{"name":"Ada King"}'
    })
  })

  it('archives and restores with a POST and no body', async () => {
    const archived = clientAnswering(() => Response.json(customer))
    const restored = clientAnswering(() => Response.json(customer))

    await archiveCustomer(archived.api, 'org-1', 'c1')
    await restoreCustomer(restored.api, 'org-1', 'c1')

    expect(sentOf(archived.fetch)).toEqual({
      path: '/api/organizations/org-1/customers/c1/archive',
      method: 'POST',
      body: undefined
    })
    expect(sentOf(restored.fetch).path).toBe('/api/organizations/org-1/customers/c1/restore')
  })

  it('deletes with a DELETE and expects no content', async () => {
    const { api, fetch } = clientAnswering(() => new Response(null, { status: 204 }))

    expect(await deleteCustomer(api, 'org-1', 'c1')).toBeUndefined()
    expect(sentOf(fetch)).toMatchObject({ path: '/api/organizations/org-1/customers/c1', method: 'DELETE' })
  })

  it('fails with the problem when the API refuses', async () => {
    const { api } = clientAnswering(() => Response.json({ code: 'customer_email_taken' }, { status: 409 }))

    await expect(createCustomer(api, 'org-1', { name: 'Ada' })).rejects.toMatchObject({ kind: 'http', status: 409 })
  })
})
