import type { ExportRepository } from '../export-repository.port'
import { newExport, readied } from '../organization-export'

const now = new Date('2026-11-19T12:00:00.000Z')
const later = new Date('2026-11-19T12:20:00.000Z')

/**
 * What every `ExportRepository` must do (ADR 0074), run against the in-memory one and the Kysely one. `setup`
 * gives a repository of `org-1` and of `org-2`, each confined to its organization as a unit of work is.
 */
export function exportRepositoryContract(
  setup: () => Promise<{ run<T>(organizationId: string, work: (exports: ExportRepository) => Promise<T>): Promise<T> }>
) {
  describe('ExportRepository contract', () => {
    const first = newExport({ id: 'export-1', organizationId: 'org-1', requestedBy: 'user-ada', now })

    it('finds nothing before a request', async () => {
      const { run } = await setup()

      expect(await run('org-1', (exports) => exports.find('org-1'))).toBeNull()
      expect(await run('org-1', (exports) => exports.file('org-1'))).toBeNull()
    })

    it('keeps a request, pending and without a file', async () => {
      const { run } = await setup()
      await run('org-1', (exports) => exports.replace(first))

      expect(await run('org-1', (exports) => exports.find('org-1'))).toEqual(first)
      expect(await run('org-1', (exports) => exports.file('org-1'))).toBeNull()
    })

    it('completes it with its file, once', async () => {
      const { run } = await setup()
      await run('org-1', (exports) => exports.replace(first))
      const ready = readied(first, { now: later, size: 3 })

      expect(await run('org-1', (exports) => exports.complete(ready, Buffer.from('zip')))).toBe(true)
      expect(await run('org-1', (exports) => exports.complete(ready, Buffer.from('two')))).toBe(false)
      expect(await run('org-1', (exports) => exports.find('org-1'))).toEqual(ready)
      expect(await run('org-1', (exports) => exports.file('org-1'))).toEqual(Buffer.from('zip'))
    })

    it('replaces the last export and its file with a new request, and refuses to complete the old one', async () => {
      const { run } = await setup()
      await run('org-1', (exports) => exports.replace(first))
      await run('org-1', (exports) => exports.complete(readied(first, { now: later, size: 3 }), Buffer.from('zip')))
      const second = newExport({ id: 'export-2', organizationId: 'org-1', requestedBy: 'user-ada', now: later })
      await run('org-1', (exports) => exports.replace(second))

      expect(await run('org-1', (exports) => exports.find('org-1'))).toEqual(second)
      expect(await run('org-1', (exports) => exports.file('org-1'))).toBeNull()
      expect(
        await run('org-1', (exports) => exports.complete(readied(first, { now: later, size: 3 }), Buffer.from('old')))
      ).toBe(false)
    })

    it("keeps each organization's export apart", async () => {
      const { run } = await setup()
      await run('org-1', (exports) => exports.replace(first))

      expect(await run('org-2', (exports) => exports.find('org-2'))).toBeNull()
    })
  })
}
