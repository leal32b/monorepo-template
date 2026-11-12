import { auditActions, auditEntryPageSchema, auditEntrySchema, listAuditEntriesQuerySchema } from './audit'

const entry = {
  id: 'e1',
  at: '2026-11-07T10:00:00.000Z',
  actor: { kind: 'member', id: 'user-ada', name: 'Ada' },
  resource: { type: 'customer', id: 'c1' },
  action: 'updated',
  fields: ['name']
}

describe('auditActions', () => {
  it('lists what the customers module records, every write of it', () => {
    expect(auditActions.customer).toEqual(['created', 'updated', 'archived', 'restored', 'deleted'])
  })
})

describe('auditEntrySchema (ADR 0061)', () => {
  it('reads an entry by a member, with their name', () => {
    expect(auditEntrySchema.parse(entry)).toEqual(entry)
  })

  it('reads a member who left, with no name, a visitor and the system', () => {
    for (const actor of [{ kind: 'member', id: 'user-gone', name: null }, { kind: 'visitor' }, { kind: 'system' }]) {
      expect(auditEntrySchema.parse({ ...entry, actor }).actor).toEqual(actor)
    }
  })

  it.each([
    ['an unknown resource', { resource: { type: 'invoice', id: 'i1' } }],
    ['an unknown action', { action: 'renamed' }],
    ['an unknown actor', { actor: { kind: 'robot' } }],
    ['a member without an id', { actor: { kind: 'member', name: 'Ada' } }]
  ])('refuses %s', (_case, change) => {
    expect(auditEntrySchema.safeParse({ ...entry, ...change }).success).toBe(false)
  })
})

describe('auditEntryPageSchema', () => {
  it('carries the entries and where the next page starts, or null at the end', () => {
    expect(auditEntryPageSchema.parse({ items: [entry], next: 'abc' })).toEqual({ items: [entry], next: 'abc' })
    expect(auditEntryPageSchema.parse({ items: [], next: null }).next).toBeNull()
  })
})

describe('listAuditEntriesQuerySchema', () => {
  it('takes no parameter, or where to start', () => {
    expect(listAuditEntriesQuerySchema.parse({})).toEqual({})
    expect(listAuditEntriesQuerySchema.parse({ before: 'abc' })).toEqual({ before: 'abc' })
  })

  it('refuses an empty or overlong cursor, and anything else', () => {
    expect(listAuditEntriesQuerySchema.safeParse({ before: '' }).success).toBe(false)
    expect(listAuditEntriesQuerySchema.safeParse({ before: 'a'.repeat(201) }).success).toBe(false)
    expect(listAuditEntriesQuerySchema.safeParse({ page: '2' }).success).toBe(false)
  })
})
