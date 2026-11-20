import { newExport, readied } from '../organization-export'
import { exportRepositoryContract } from './export-repository.contract'
import { InMemoryExportRepository } from './in-memory-export-repository'

exportRepositoryContract(async () => {
  const exports = new InMemoryExportRepository()
  return { run: (_organizationId, work) => work(exports) }
})

describe('InMemoryExportRepository', () => {
  it('empties an export as the purge does, and puts it back on a snapshot', async () => {
    const exports = new InMemoryExportRepository()
    const now = new Date('2026-11-19T12:00:00Z')
    const record = newExport({ id: 'export-1', organizationId: 'org-1', requestedBy: 'user-ada', now })
    await exports.replace(record)
    await exports.complete(readied(record, { now, size: 3 }), Buffer.from('zip'))
    const restore = exports.snapshot()

    exports.empty('org-1')
    exports.empty('org-2')
    expect(await exports.file('org-1')).toBeNull()
    restore()
    expect(await exports.file('org-1')).toEqual(Buffer.from('zip'))
  })
})
