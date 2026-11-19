import { inflateRawSync } from 'node:zlib'
import { dataExportEmails } from '../../emails/data-export-emails'
import { newExport } from '../../organization-export'
import { dataExportKit } from '../../testing/data-export-kit'
import { BuildExportService } from './build-export.service'

/** The names and texts of a zip's files, by its central directory. */
function filesOf(archive: Buffer): Record<string, string> {
  const end = archive.lastIndexOf(Buffer.from([0x50, 0x4b, 0x05, 0x06]))
  let at = archive.readUInt32LE(end + 16)
  const files: Record<string, string> = {}
  for (let index = 0; index < archive.readUInt16LE(end + 10); index++) {
    const size = archive.readUInt32LE(at + 20)
    const nameLength = archive.readUInt16LE(at + 28)
    const offset = archive.readUInt32LE(at + 42)
    const data = offset + 30 + archive.readUInt16LE(offset + 26)
    files[archive.subarray(at + 46, at + 46 + nameLength).toString()] = inflateRawSync(
      archive.subarray(data, data + size)
    ).toString()
    at += 46 + nameLength
  }
  return files
}

async function requested(requestedBy = 'user-ada', organizationId = 'org-1') {
  const kit = dataExportKit()
  const record = newExport({ id: 'export-1', organizationId, requestedBy, now: kit.clock.now() })
  await kit.exports.replace(record)
  kit.clock.advance(5000)
  const service = new BuildExportService(kit)
  return { kit, record, service }
}

describe('BuildExportService (ADR 0074)', () => {
  it("builds a zip of one CSV per table, the plugin's and the tenant's, and keeps it ready for 7 days", async () => {
    const { kit, service } = await requested()

    await service.execute({ organizationId: 'org-1', exportId: 'export-1' })

    const file = (await kit.exports.file('org-1')) as Buffer
    expect(filesOf(file)).toEqual({
      'organization.csv': '﻿id,name\r\norg-1,Acme Barbers\r\n',
      'customers.csv': '﻿id,name\r\nc-1,Grace\r\n'
    })
    expect(await kit.exports.find('org-1')).toMatchObject({
      readyAt: kit.clock.now(),
      expiresAt: new Date('2026-11-26T12:00:05.000Z'),
      size: file.length
    })
  })

  it('emails the owner who asked, in their language, with the day it expires in the organization’s calendar', async () => {
    const { kit, service } = await requested()

    await service.execute({ organizationId: 'org-1', exportId: 'export-1' })

    expect(kit.jobs.all).toMatchObject([
      {
        kind: dataExportEmails.job.kind,
        payload: {
          email: 'exportReady',
          to: 'ada@example.com',
          locale: 'pt-BR',
          url: 'https://app.example.com/acme/settings/general',
          values: { organization: 'Acme Barbers', expires: '26 de novembro de 2026' }
        }
      }
    ])
  })

  it('builds it but emails no one when the owner who asked is no longer a member', async () => {
    const { kit, service } = await requested('user-gone')

    await service.execute({ organizationId: 'org-1', exportId: 'export-1' })

    expect(await kit.exports.file('org-1')).not.toBeNull()
    expect(kit.jobs.all).toEqual([])
  })

  it('does nothing for an export a new request replaced, one already built, or an organization gone', async () => {
    const { kit, service } = await requested()
    await service.execute({ organizationId: 'org-1', exportId: 'export-0' })
    expect(await kit.exports.file('org-1')).toBeNull()

    await service.execute({ organizationId: 'org-1', exportId: 'export-1' })
    await service.execute({ organizationId: 'org-1', exportId: 'export-1' })
    expect(kit.jobs.all).toHaveLength(1)

    const gone = await requested('user-ada', 'org-9')
    await gone.service.execute({ organizationId: 'org-9', exportId: 'export-1' })
    expect(await gone.kit.exports.file('org-9')).toBeNull()
  })

  it('sends nothing when a request replaced the export while it was being built', async () => {
    const { kit, record, service } = await requested()
    const read = kit.directory.read
    kit.directory.read = async (organizationId, requesterId) => {
      await kit.exports.replace({ ...record, id: 'export-2' })
      return read(organizationId, requesterId)
    }

    await service.execute({ organizationId: 'org-1', exportId: 'export-1' })

    expect(await kit.exports.file('org-1')).toBeNull()
    expect(kit.jobs.all).toEqual([])
  })
})
