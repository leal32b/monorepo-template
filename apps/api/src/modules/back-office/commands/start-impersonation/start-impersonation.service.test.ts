import { FixedClock } from '#libs/adapters/fixed-clock'
import { CountingIds } from '#libs/jobs/testing/jobs.contract'
import { GetImpersonationService } from '../../queries/get-impersonation/get-impersonation.service'
import { anOrganization, InMemoryBackOffice } from '../../testing/in-memory-back-office'
import { EndImpersonationService } from '../end-impersonation/end-impersonation.service'
import { StartImpersonationService } from './start-impersonation.service'

const minute = 60 * 1000

function setup() {
  const clock = new FixedClock(new Date('2026-11-20T12:00:00Z'))
  const ids = new CountingIds()
  const backOffice = new InMemoryBackOffice(ids, clock)
  backOffice.organizations.push(anOrganization('org-acme'), anOrganization('org-beta'))
  return {
    clock,
    backOffice,
    start: new StartImpersonationService(backOffice, ids, clock),
    end: new EndImpersonationService(backOffice, ids, clock),
    current: new GetImpersonationService(backOffice, clock)
  }
}

const trail = async (backOffice: InMemoryBackOffice, organizationId: string) =>
  (await backOffice.audit.list(organizationId, { limit: 10 })).map(({ actor, action, resourceType, resourceId }) => ({
    actor,
    action,
    resourceType,
    resourceId
  }))

describe('entering and leaving an organization (ADR 0077)', () => {
  it('starts a 30-minute visit, records it in the organization’s trail naming the operator, and enqueues its end', async () => {
    const { backOffice, start, current } = setup()

    const visit = await start.execute('user-otto', 'org-acme')

    expect(visit).toEqual({
      organization: { id: 'org-acme', name: 'Name of org-acme', slug: 'org-acme' },
      startedAt: '2026-11-20T12:00:00.000Z',
      endsAt: '2026-11-20T12:30:00.000Z'
    })
    expect(await current.execute('user-otto')).toEqual({ impersonation: visit })
    expect(await trail(backOffice, 'org-acme')).toEqual([
      {
        actor: { kind: 'operator', id: 'user-otto' },
        action: 'impersonation-started',
        resourceType: 'organization',
        resourceId: 'org-acme'
      }
    ])
    expect(backOffice.jobs.all).toMatchObject([
      {
        kind: 'back-office.end-impersonation',
        payload: { impersonationId: backOffice.visits[0]?.id },
        runAt: new Date('2026-11-20T12:30:00Z')
      }
    ])
  })

  it('refuses a second visit while the first lasts, and an organization that does not exist', async () => {
    const { start } = setup()
    await start.execute('user-otto', 'org-acme')

    await expect(start.execute('user-otto', 'org-beta')).rejects.toMatchObject({ code: 'impersonation_active' })
    await expect(start.execute('user-otto', 'org-missing')).rejects.toMatchObject({ code: 'organization_not_found' })
  })

  it('ends a visit past its time before starting the next, as its job would, and says none is active meanwhile', async () => {
    const { backOffice, clock, start, current } = setup()
    await start.execute('user-otto', 'org-acme')
    clock.advance(31 * minute)

    expect(await current.execute('user-otto')).toEqual({ impersonation: null })
    await start.execute('user-otto', 'org-beta')

    expect(backOffice.visits.map(({ endReason }) => endReason)).toEqual(['expired', null])
    expect((await trail(backOffice, 'org-acme')).map(({ action }) => action)).toEqual([
      'impersonation-ended',
      'impersonation-started'
    ])
  })

  it('leaves, recording the end once, whoever ends it first: the operator, the job or a revocation', async () => {
    const { backOffice, start, end, current } = setup()
    await start.execute('user-otto', 'org-acme')
    const id = backOffice.visits[0]?.id as string

    await end.leave('user-otto')
    await end.end(id, 'expired')
    await end.leave('user-otto')

    expect(await current.execute('user-otto')).toEqual({ impersonation: null })
    expect(backOffice.visits[0]?.endReason).toBe('left')
    expect((await trail(backOffice, 'org-acme')).map(({ actor, action }) => [actor, action])).toEqual([
      [{ kind: 'operator', id: 'user-otto' }, 'impersonation-ended'],
      [{ kind: 'operator', id: 'user-otto' }, 'impersonation-started']
    ])
  })
})
