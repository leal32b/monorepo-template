import { createApiClient } from '#shared/api'
import { visitToAcme } from '../../../test-back-office'
import {
  getImpersonation,
  getOrganization,
  leaveImpersonation,
  listOrganizations,
  listUsers,
  startImpersonation
} from './back-office-api'

const page = { items: [], total: 0, page: 1, pageSize: 20 }

function client(body: unknown, status = 200) {
  const fetch = vi.fn(async (_path: string, _init?: RequestInit) =>
    status === 204 ? new Response(null, { status }) : Response.json(body, { status })
  )
  return { api: createApiClient({ fetch }), fetch }
}

describe('the back office API (ADR 0077)', () => {
  it('asks for a page of organizations and of users, with the search only when there is one', async () => {
    const { api, fetch } = client(page)

    expect(await listOrganizations(api, { search: '', page: 2 })).toEqual(page)
    await listUsers(api, { search: 'ada b', page: 1 })

    expect(fetch.mock.calls.map(([path]) => path)).toEqual([
      '/api/admin/organizations?page=2',
      '/api/admin/users?page=1&search=ada+b'
    ])
  })

  it("reads an organization's page by its id", async () => {
    const { api, fetch } = client({ nope: true })

    await expect(getOrganization(api, 'org/1')).rejects.toMatchObject({ kind: 'contract' })
    expect(fetch.mock.calls[0]?.[0]).toBe('/api/admin/organizations/org%2F1')
  })

  it('asks which visit is on, starts one and leaves it', async () => {
    const reads = client({ impersonation: visitToAcme })
    expect(await getImpersonation(reads.api)).toEqual({ impersonation: visitToAcme })
    expect(reads.fetch.mock.calls[0]?.[0]).toBe('/api/admin/impersonation')

    const starts = client(visitToAcme, 201)
    expect(await startImpersonation(starts.api, 'org-1')).toEqual(visitToAcme)
    expect(starts.fetch.mock.calls[0]).toEqual([
      '/api/admin/organizations/org-1/impersonation',
      expect.objectContaining({ method: 'POST' })
    ])

    const leaves = client(undefined, 204)
    await leaveImpersonation(leaves.api)
    expect(leaves.fetch.mock.calls[0]).toEqual([
      '/api/admin/impersonation',
      expect.objectContaining({ method: 'DELETE' })
    ])
  })
})
