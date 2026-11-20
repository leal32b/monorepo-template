import { FileRedirect } from '#libs/http/file'
import { memoryLogger } from '#libs/jobs/testing/memory-logger'
import { ExportNotFoundException } from '../../data-export.errors'
import { newExport, readied } from '../../organization-export'
import { dataExportKit } from '../../testing/data-export-kit'
import { DownloadExportService } from './download-export.service'

const ada = { kind: 'member', id: 'user-ada' } as const

async function withReadyExport() {
  const kit = dataExportKit()
  const { logger, lines } = memoryLogger()
  const record = newExport({ id: 'export-1', organizationId: 'org-1', requestedBy: 'user-ada', now: kit.clock.now() })
  await kit.exports.replace(record)
  await kit.exports.complete(readied(record, { now: kit.clock.now(), size: 3 }))
  return { kit, lines, service: new DownloadExportService({ ...kit, logger }) }
}

describe('DownloadExportService (ADR 0074, ADR 0076)', () => {
  it('sends to the store’s address for 5 minutes, naming the zip by the day it was asked for, and logs who took it', async () => {
    const { service, lines } = await withReadyExport()

    const file = await service.execute('org-1', ada)

    expect(file).toEqual(
      new FileRedirect(
        'memory://exports/org-1/export-1.zip?signedAt=2026-11-19T12:00:00.000Z&expires=300&name=organization-export-2026-11-19.zip'
      )
    )
    expect(lines).toContainEqual(
      expect.objectContaining({
        msg: 'export downloaded',
        organizationId: 'org-1',
        exportId: 'export-1',
        actorId: 'user-ada'
      })
    )
  })

  it('refuses once the export expired', async () => {
    const { kit, service } = await withReadyExport()
    kit.clock.advance(7 * 24 * 60 * 60 * 1000)

    await expect(service.execute('org-1', ada)).rejects.toThrow(ExportNotFoundException)
  })

  it('refuses when nothing was asked for', async () => {
    const kit = dataExportKit()
    const service = new DownloadExportService({ ...kit, logger: memoryLogger().logger })

    await expect(service.execute('org-1', ada)).rejects.toThrow(ExportNotFoundException)
  })
})
