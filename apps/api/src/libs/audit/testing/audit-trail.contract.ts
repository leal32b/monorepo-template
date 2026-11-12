import type { AuditEntry, AuditTrail } from '#libs/ports/audit-trail.port'

/** The organizations a trail under test must know (a database adapter creates them first). */
export const auditOrganizations = ['org-1', 'org-2'] as const

export const auditDay = new Date('2026-11-07T10:00:00.000Z')

export function anEntry(id: string, overrides: Partial<AuditEntry> = {}): AuditEntry {
  return {
    id,
    organizationId: 'org-1',
    at: auditDay,
    actor: { kind: 'member', id: 'user-ada' },
    resourceType: 'customer',
    resourceId: 'c1',
    action: 'updated',
    fields: ['name', 'email'],
    ...overrides
  }
}

const minutes = (n: number) => new Date(auditDay.getTime() + n * 60 * 1000)

/**
 * What every `AuditTrail` must do (ADR 0061), run against the in-memory fake and the database adapter
 * alike. The organizations are those of `auditOrganizations`.
 */
export function describeAuditTrail(label: string, make: () => Promise<AuditTrail>): void {
  describe(`${label} as an AuditTrail`, () => {
    let trail: AuditTrail

    beforeEach(async () => {
      trail = await make()
    })

    const ids = (entries: AuditEntry[]) => entries.map((entry) => entry.id)

    it('keeps an entry whole', async () => {
      await trail.record(anEntry('e1'))

      expect(await trail.list('org-1', { limit: 10 })).toEqual([anEntry('e1')])
    })

    it('keeps a visitor and the system, who have no id, and a change with no field', async () => {
      const byVisitor = anEntry('e1', { actor: { kind: 'visitor' }, action: 'created', fields: ['name'] })
      const bySystem = anEntry('e2', { actor: { kind: 'system' }, action: 'archived', fields: [], at: minutes(1) })
      await trail.record(byVisitor)
      await trail.record(bySystem)

      expect(await trail.list('org-1', { limit: 10 })).toEqual([bySystem, byVisitor])
    })

    it('lists the newest first, then by id from last to first', async () => {
      await trail.record(anEntry('e0', { at: minutes(-1) }))
      await trail.record(anEntry('e1'))
      await trail.record(anEntry('e3'))
      await trail.record(anEntry('e2'))
      await trail.record(anEntry('e4', { at: minutes(1) }))

      expect(ids(await trail.list('org-1', { limit: 10 }))).toEqual(['e4', 'e3', 'e2', 'e1', 'e0'])
    })

    it('pages by the last entry seen: at most `limit`, and only what is older than it', async () => {
      for (const [id, minute] of [
        ['e1', 0],
        ['e2', 0],
        ['e3', 1],
        ['e4', 2]
      ] as const) {
        await trail.record(anEntry(id, { at: minutes(minute) }))
      }

      const first = await trail.list('org-1', { limit: 2 })
      const last = first.at(-1) as AuditEntry
      const second = await trail.list('org-1', { before: { at: last.at, id: last.id }, limit: 2 })
      const beyond = await trail.list('org-1', { before: { at: minutes(0), id: 'e1' }, limit: 2 })

      expect(ids(first)).toEqual(['e4', 'e3'])
      expect(ids(second)).toEqual(['e2', 'e1'])
      expect(beyond).toEqual([])
    })

    it('shows nothing of another organization', async () => {
      await trail.record(anEntry('e1'))
      await trail.record(anEntry('e2', { organizationId: 'org-2' }))

      expect(ids(await trail.list('org-2', { limit: 10 }))).toEqual(['e2'])
    })

    it('refuses an id it already has, and keeps the first entry', async () => {
      await trail.record(anEntry('e1'))

      await expect(trail.record(anEntry('e1', { action: 'deleted' }))).rejects.toThrow()
      expect(await trail.list('org-1', { limit: 10 })).toEqual([anEntry('e1')])
    })
  })
}
