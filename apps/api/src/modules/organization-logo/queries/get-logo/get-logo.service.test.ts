import { organizationLogoKit } from '../../testing/organization-logo-kit'
import { GetLogoService } from './get-logo.service'

describe('GetLogoService (ADR 0076)', () => {
  it('answers the logo at an address signed at the start of the day, the same until midnight', async () => {
    const kit = organizationLogoKit(new Date('2026-11-20T00:00:01.000Z'))
    await kit.logos.save({
      id: 'logo-1',
      organizationId: 'org-1',
      type: 'image/webp',
      width: 300,
      height: 100,
      size: 10,
      updatedBy: 'user-ada',
      updatedAt: kit.clock.now()
    })
    const service = new GetLogoService(kit)

    const morning = await service.execute('org-1')
    kit.clock.advance(23 * 60 * 60 * 1000)

    expect(morning).toEqual({
      url: 'memory://logos/org-1/logo-1?signedAt=2026-11-20T00:00:00.000Z&expires=172800',
      width: 300,
      height: 100
    })
    expect(await service.execute('org-1')).toEqual(morning)
  })

  it('answers null for an organization without a logo', async () => {
    expect(await new GetLogoService(organizationLogoKit()).execute('org-1')).toBeNull()
  })
})
