import { newExport } from '../organization-export'
import { exportRepositoryContract } from './export-repository.contract'
import { InMemoryExportRepository } from './in-memory-export-repository'

exportRepositoryContract(async () => {
  const exports = new InMemoryExportRepository()
  return { run: (_organizationId, work) => work(exports) }
})

describe('InMemoryExportRepository', () => {
  it('puts itself back as a snapshot found it', async () => {
    const exports = new InMemoryExportRepository()
    const restore = exports.snapshot()
    await exports.replace(newExport({ id: 'export-1', organizationId: 'org-1', requestedBy: 'u', now: new Date() }))

    restore()

    expect(await exports.find('org-1')).toBeNull()
  })
})
