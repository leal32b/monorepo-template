import { deleteFiles } from '#libs/storage/delete-files'
import { ExportTooSoonException } from '../../data-export.errors'
import { buildExport } from '../../jobs/data-export-jobs'
import { readied } from '../../organization-export'
import { dataExportKit } from '../../testing/data-export-kit'
import { RequestExportService } from './request-export.service'

const ada = { kind: 'member', id: 'user-ada' } as const

describe('RequestExportService (ADR 0074)', () => {
  it('keeps the request, records who asked and enqueues the build, together, and answers it pending', async () => {
    const kit = dataExportKit()
    const service = new RequestExportService(kit.unitOfWork, kit.clock, kit.ids)

    const state = await service.execute('org-1', ada)

    expect(state).toEqual({
      status: 'pending',
      requestedAt: '2026-11-19T12:00:00.000Z',
      nextRequestAt: '2026-11-19T12:15:00.000Z'
    })
    expect(await kit.exports.find('org-1')).toMatchObject({ id: 'id-1', requestedBy: 'user-ada', readyAt: null })
    expect(await kit.audit.list('org-1', { limit: 5 })).toEqual([
      {
        id: 'id-2',
        organizationId: 'org-1',
        at: kit.clock.now(),
        actor: ada,
        resourceType: 'organization',
        resourceId: 'org-1',
        action: 'export-requested',
        fields: []
      }
    ])
    expect(kit.jobs.all).toMatchObject([
      { kind: buildExport.kind, payload: { organizationId: 'org-1', exportId: 'id-1' } }
    ])
  })

  it('refuses another request within 15 minutes, and changes nothing', async () => {
    const kit = dataExportKit()
    const service = new RequestExportService(kit.unitOfWork, kit.clock, kit.ids)
    await service.execute('org-1', ada)
    kit.clock.advance(14 * 60 * 1000)

    await expect(service.execute('org-1', ada)).rejects.toThrow(ExportTooSoonException)
    expect(await kit.exports.find('org-1')).toMatchObject({ id: 'id-1' })
    expect(kit.jobs.all).toHaveLength(1)
  })

  it('replaces the last export once 15 minutes passed', async () => {
    const kit = dataExportKit()
    const service = new RequestExportService(kit.unitOfWork, kit.clock, kit.ids)
    await service.execute('org-1', ada)
    kit.clock.advance(15 * 60 * 1000)

    await service.execute('org-1', ada)

    expect(await kit.exports.find('org-1')).toMatchObject({ requestedAt: kit.clock.now() })
  })

  it('deletes the file of a ready export it replaces, and none of one expired (ADR 0076)', async () => {
    const kit = dataExportKit()
    const service = new RequestExportService(kit.unitOfWork, kit.clock, kit.ids)
    await service.execute('org-1', ada)
    const first = await kit.exports.find('org-1')
    await kit.exports.complete(readied(first as NonNullable<typeof first>, { now: kit.clock.now(), size: 3 }))
    kit.clock.advance(15 * 60 * 1000)

    await service.execute('org-1', ada)
    kit.clock.advance(8 * 24 * 60 * 60 * 1000)
    const second = await kit.exports.find('org-1')
    await kit.exports.complete(readied(second as NonNullable<typeof second>, { now: new Date(0), size: 3 }))
    await service.execute('org-1', ada)

    expect(kit.jobs.all.filter(({ kind }) => kind === deleteFiles.kind).map(({ payload }) => payload)).toEqual([
      { keys: ['exports/org-1/id-1.zip'] }
    ])
  })
})
