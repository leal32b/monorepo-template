import { createApiClient } from '#shared/api'
import { auditEntriesQuery } from './audit-query'

const entry = {
  id: 'e1',
  at: '2026-11-07T10:00:00.000Z',
  actor: { kind: 'visitor' },
  resource: { type: 'customer', id: 'c1' },
  action: 'created',
  fields: ['name']
}

describe('auditEntriesQuery (ADR 0061)', () => {
  it('reads the newest page, keyed by the organization', async () => {
    const fetch = vi.fn(async (_path: string) => Response.json({ items: [entry], next: 'abc' }))
    const entries = auditEntriesQuery(createApiClient({ fetch }))

    expect(await entries('org/1', '')).toEqual({ items: [entry], next: 'abc' })
    expect(fetch.mock.calls[0]?.[0]).toBe('/api/organizations/org%2F1/audit-entries')
  })

  it('reads the page that starts where another ended, keyed by where it starts', async () => {
    const fetch = vi.fn(async (_path: string) => Response.json({ items: [], next: null }))
    const entries = auditEntriesQuery(createApiClient({ fetch }))

    await entries('org-1', 'a+b/c')

    expect(fetch.mock.calls[0]?.[0]).toBe('/api/organizations/org-1/audit-entries?before=a%2Bb%2Fc')
    expect(entries.keyFor('org-1', '')).not.toBe(entries.keyFor('org-1', 'a+b/c'))
  })
})
