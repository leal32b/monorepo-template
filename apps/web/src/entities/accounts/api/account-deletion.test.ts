import { createApiClient } from '#shared/api'
import { getAccountDeletion } from './account-deletion'

describe('getAccountDeletion', () => {
  it('reads what deleting the account would do, checked against the contract', async () => {
    const fetch = vi.fn(async (_path: string) =>
      Response.json({ organizations: [{ id: 'org-1', name: 'Acme', slug: 'acme', outcome: 'blocked' }] })
    )

    await expect(getAccountDeletion(createApiClient({ fetch }))).resolves.toEqual({
      organizations: [{ id: 'org-1', name: 'Acme', slug: 'acme', outcome: 'blocked' }]
    })
    expect(fetch.mock.calls[0]?.[0]).toBe('/api/me/account-deletion')
  })
})
