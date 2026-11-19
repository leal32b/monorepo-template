import { createApiClient } from '#shared/api'
import { exportFileUrl, getExport, requestExport } from './export-api'
import { organizationExportQuery } from './export-query'

const pending = {
  status: 'pending',
  requestedAt: '2026-11-19T12:00:00.000Z',
  nextRequestAt: '2026-11-19T12:15:00.000Z'
}

describe('the organization export api (ADR 0074)', () => {
  it('reads the last export of an organization, through the query too', async () => {
    const fetch = vi.fn(async (_path: string) => Response.json({ status: 'none' }))
    const api = createApiClient({ fetch })

    expect(await getExport(api, 'org 1')).toEqual({ status: 'none' })
    expect(await organizationExportQuery(api)('org-2')).toEqual({ status: 'none' })
    expect(fetch.mock.calls.map(([path]) => path)).toEqual([
      '/api/organizations/org%201/export',
      '/api/organizations/org-2/export'
    ])
  })

  it('asks for a new export with a POST and no body', async () => {
    const fetch = vi.fn(async (_path: string, _init?: RequestInit) => Response.json(pending, { status: 202 }))

    expect(await requestExport(createApiClient({ fetch }), 'org-1')).toEqual(pending)
    expect(fetch.mock.calls[0]?.[1]).toMatchObject({ method: 'POST' })
    expect(fetch.mock.calls[0]?.[1]?.body).toBeUndefined()
  })

  it('says where the zip is downloaded from', () => {
    expect(exportFileUrl(createApiClient({ fetch: vi.fn(), baseUrl: 'https://api.example.com' }), 'org-1')).toBe(
      'https://api.example.com/api/organizations/org-1/export/file'
    )
  })
})
