import { newExport } from '../../organization-export'
import { dataExportKit } from '../../testing/data-export-kit'
import { GetExportService } from './get-export.service'

describe('GetExportService (ADR 0074)', () => {
  it('answers none before any request', async () => {
    const kit = dataExportKit()

    expect(await new GetExportService(kit.unitOfWork, kit.clock).execute('org-1')).toEqual({ status: 'none' })
  })

  it("answers the organization's last export by the clock", async () => {
    const kit = dataExportKit()
    await kit.exports.replace(
      newExport({ id: 'export-1', organizationId: 'org-1', requestedBy: 'user-ada', now: kit.clock.now() })
    )
    kit.clock.advance(20 * 60 * 1000)

    expect(await new GetExportService(kit.unitOfWork, kit.clock).execute('org-1')).toMatchObject({
      status: 'pending',
      nextRequestAt: null
    })
  })
})
