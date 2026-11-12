import { createApiClient } from '#shared/api'
import { membershipQuery } from './membership-query'

describe('membershipQuery', () => {
  it('reads what the caller may do in an organization once for every reader of its key (ADR 0038)', async () => {
    const membership = { roles: ['member'], permissions: { customer: ['read'] } }
    const fetch = vi.fn(async (_path: string) => Response.json(membership))
    const read = membershipQuery(createApiClient({ fetch }))

    const [first, second] = await Promise.all([read('org-q'), read('org-q')])

    expect(first).toEqual(membership)
    expect(second).toEqual(membership)
    expect(fetch).toHaveBeenCalledOnce()
    expect(read.keyFor('org-q')).not.toBe(read.keyFor('org-r'))
  })
})
