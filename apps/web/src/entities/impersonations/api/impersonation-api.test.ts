import { createApiClient } from '#shared/api'
import { visitToAcme } from '../../../test-back-office'
import { getImpersonation, leaveImpersonation, startImpersonation } from './impersonation-api'

function client(body: unknown, status = 200) {
  const fetch = vi.fn(async (_path: string, _init?: RequestInit) =>
    status === 204 ? new Response(null, { status }) : Response.json(body, { status })
  )
  return { api: createApiClient({ fetch }), fetch }
}

describe("the operator's visit API (ADR 0077)", () => {
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
