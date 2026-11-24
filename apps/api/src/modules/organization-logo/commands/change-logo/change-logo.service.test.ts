import { deleteFiles } from '#libs/storage/delete-files'
import {
  LogoDimensionsException,
  LogoTooLargeException,
  LogoTypeUnsupportedException,
  LogoUploadMissingException
} from '../../organization-logo.errors'
import { organizationLogoKit, png } from '../../testing/organization-logo-kit'
import { ChangeLogoService } from './change-logo.service'

const ada = { kind: 'member', id: 'user-ada' } as const
const uploadId = 'aaaaaaaa-0000-4000-8000-000000000000'

/** The kit with a file uploaded under `org-1`, as the browser would have sent it. */
async function uploaded(content: Buffer, type = 'image/png') {
  const kit = organizationLogoKit()
  await kit.storage.write(`uploads/org-1/${uploadId}`, content, { type })
  return { kit, service: new ChangeLogoService(kit) }
}

describe('ChangeLogoService (ADR 0076)', () => {
  it('writes the checked bytes to the logo’s key, keeps the logo, records it and enqueues the upload’s deletion', async () => {
    const { kit, service } = await uploaded(png(256, 128), 'application/octet-stream')

    const logo = await service.execute('org-1', { uploadId }, ada)

    const logoId = '00000000-0000-4000-8000-000000000001'
    expect(logo).toEqual({
      url: `memory://logos/org-1/${logoId}?signedAt=2026-11-20T00:00:00.000Z&expires=172800`,
      width: 256,
      height: 128
    })
    expect(kit.storage.files.get(`logos/org-1/${logoId}`)).toEqual({
      content: png(256, 128),
      type: 'image/png',
      cacheControl: 'private, max-age=86400, immutable'
    })
    expect(await kit.logos.find('org-1')).toEqual({
      id: logoId,
      organizationId: 'org-1',
      type: 'image/png',
      width: 256,
      height: 128,
      size: 33,
      updatedBy: 'user-ada',
      updatedAt: kit.clock.now()
    })
    expect(await kit.audit.list('org-1', { limit: 5 })).toMatchObject([
      { actor: ada, resourceType: 'organization', resourceId: 'org-1', action: 'logo-changed', fields: [] }
    ])
    expect(kit.jobs.all).toMatchObject([{ kind: deleteFiles.kind, payload: { keys: [`uploads/org-1/${uploadId}`] } }])
  })

  it('replaces a logo: the new one has a new key, and the old one is deleted with the upload', async () => {
    const { kit, service } = await uploaded(png(256, 256))
    const first = await service.execute('org-1', { uploadId }, ada)
    await kit.storage.write(`uploads/org-1/${uploadId}`, png(512, 512), { type: 'image/png' })

    const second = await service.execute('org-1', { uploadId }, ada)

    expect(second.url).not.toBe(first.url)
    expect(second.width).toBe(512)
    expect(kit.jobs.all[1]?.payload).toEqual({
      keys: [`uploads/org-1/${uploadId}`, 'logos/org-1/00000000-0000-4000-8000-000000000001']
    })
  })

  it('finds no upload of another organization, nor one never sent', async () => {
    const { service } = await uploaded(png(256, 256))

    await expect(service.execute('org-2', { uploadId }, ada)).rejects.toThrow(LogoUploadMissingException)
    await expect(service.execute('org-1', { uploadId: 'bbbbbbbb-0000-4000-8000-000000000000' }, ada)).rejects.toThrow(
      LogoUploadMissingException
    )
  })

  it('finds no upload that went between its size and its bytes', async () => {
    const { kit, service } = await uploaded(png(256, 256))
    vi.spyOn(kit.storage, 'read').mockResolvedValue(null)

    await expect(service.execute('org-1', { uploadId }, ada)).rejects.toThrow(LogoUploadMissingException)
  })

  it('refuses a file over 1 MiB by its size, before reading it', async () => {
    const { kit, service } = await uploaded(Buffer.alloc(1_048_577))
    const read = vi.spyOn(kit.storage, 'read')

    await expect(service.execute('org-1', { uploadId }, ada)).rejects.toThrow(LogoTooLargeException)
    expect(read).not.toHaveBeenCalled()
  })

  it.each([
    ['an SVG', Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"/>')],
    ['a page', Buffer.from('<!doctype html><script>alert(1)</script>')]
  ])('refuses %s sent as a PNG, by its bytes', async (_case, content) => {
    const { service } = await uploaded(content, 'image/png')

    await expect(service.execute('org-1', { uploadId }, ada)).rejects.toThrow(LogoTypeUnsupportedException)
  })

  it.each([
    [63, 256],
    [256, 4097]
  ])('refuses an image of %i×%i pixels', async (width, height) => {
    const { kit, service } = await uploaded(png(width, height))

    await expect(service.execute('org-1', { uploadId }, ada)).rejects.toThrow(LogoDimensionsException)
    expect(await kit.logos.find('org-1')).toBeNull()
  })

  it('deletes the new image when the logo cannot be kept, and leaves the upload for another try', async () => {
    const { kit, service } = await uploaded(png(256, 256))
    vi.spyOn(kit.audit, 'record').mockRejectedValue(new Error('database down'))

    await expect(service.execute('org-1', { uploadId }, ada)).rejects.toThrow('database down')
    expect([...kit.storage.files.keys()]).toEqual([`uploads/org-1/${uploadId}`])
    expect(await kit.logos.find('org-1')).toBeNull()
  })
})
