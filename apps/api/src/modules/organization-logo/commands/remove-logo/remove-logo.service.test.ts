import { deleteFiles } from '#libs/storage/delete-files'
import { organizationLogoKit } from '../../testing/organization-logo-kit'
import { RemoveLogoService } from './remove-logo.service'

const ada = { kind: 'member', id: 'user-ada' } as const

describe('RemoveLogoService (ADR 0076)', () => {
  it('removes the logo, records who, and enqueues the deletion of its image', async () => {
    const kit = organizationLogoKit()
    await kit.logos.save({
      id: 'logo-1',
      organizationId: 'org-1',
      type: 'image/png',
      width: 64,
      height: 64,
      size: 10,
      updatedBy: 'user-ada',
      updatedAt: kit.clock.now()
    })

    await new RemoveLogoService(kit).execute('org-1', ada)

    expect(await kit.logos.find('org-1')).toBeNull()
    expect(await kit.audit.list('org-1', { limit: 5 })).toMatchObject([{ action: 'logo-removed', actor: ada }])
    expect(kit.jobs.all).toMatchObject([{ kind: deleteFiles.kind, payload: { keys: ['logos/org-1/logo-1'] } }])
  })

  it('changes nothing when there is no logo', async () => {
    const kit = organizationLogoKit()

    await new RemoveLogoService(kit).execute('org-1', ada)

    expect(await kit.audit.list('org-1', { limit: 5 })).toEqual([])
    expect(kit.jobs.all).toEqual([])
  })
})
