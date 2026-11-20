import { LogoUploadsTooManyException } from '../../organization-logo.errors'
import { organizationLogoKit } from '../../testing/organization-logo-kit'
import { SignLogoUploadService } from './sign-logo-upload.service'

describe('SignLogoUploadService (ADR 0076)', () => {
  it('signs a PUT of the type and size asked, under the organization, with an upload id', async () => {
    const kit = organizationLogoKit()
    const service = new SignLogoUploadService(kit)

    expect(await service.execute('org-1', { type: 'image/png', size: 2048 })).toEqual({
      uploadId: '00000000-0000-4000-8000-000000000001',
      url: 'memory://uploads/org-1/00000000-0000-4000-8000-000000000001?type=image/png&size=2048',
      headers: { 'Content-Type': 'image/png' },
      expiresAt: '2000-01-01T00:05:00.000Z'
    })
  })

  it('signs 20 uploads an hour per organization, then refuses until the hour is over', async () => {
    const kit = organizationLogoKit()
    const service = new SignLogoUploadService(kit)
    for (let index = 0; index < 20; index++) await service.execute('org-1', { type: 'image/png', size: 1 })

    await expect(service.execute('org-1', { type: 'image/png', size: 1 })).rejects.toThrow(LogoUploadsTooManyException)
    await expect(service.execute('org-2', { type: 'image/png', size: 1 })).resolves.toBeDefined()
    kit.clock.advance(60 * 60 * 1000)
    await expect(service.execute('org-1', { type: 'image/png', size: 1 })).resolves.toBeDefined()
  })
})
