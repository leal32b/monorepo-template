import { backOfficeOrganizationDetailSchema } from '@repo/contracts'
import { FixedClock } from '#libs/adapters/fixed-clock'
import { CountingIds } from '#libs/jobs/testing/jobs.contract'
import { anOrganization, InMemoryBackOffice } from '../../testing/in-memory-back-office'
import { GetOrganizationService } from './get-organization.service'

describe('GetOrganizationService (ADR 0077)', () => {
  const clock = new FixedClock(new Date('2026-11-20T00:00:00Z'))
  const backOffice = new InMemoryBackOffice(new CountingIds(), clock)
  const service = new GetOrganizationService(backOffice, clock)

  it("answers the organization's page in the shape of the contract", async () => {
    backOffice.organizations.push(
      anOrganization('org-paid', {
        subscription: {
          status: 'past_due',
          plan: 'pro',
          nextPlan: null,
          trialEndsAt: new Date('2026-11-01T00:00:00Z'),
          periodStartsAt: new Date('2026-10-20T00:00:00Z'),
          paidThrough: new Date('2026-11-20T00:00:00Z'),
          pastDueSince: new Date('2026-11-19T00:00:00Z'),
          cancelAtPeriodEnd: false,
          checkout: null
        }
      })
    )

    const page = await service.execute('org-paid')

    expect(backOfficeOrganizationDetailSchema.parse(page)).toEqual(page)
    expect(page).toMatchObject({
      createdAt: '2026-11-01T09:00:00.000Z',
      subscription: { status: 'past_due', access: 'full', pastDueSince: '2026-11-19T00:00:00.000Z' },
      members: [{ id: 'user-ada', joinedAt: '2026-11-01T09:00:00.000Z' }]
    })
  })

  it('says when no organization has the id', async () => {
    await expect(service.execute('org-missing')).rejects.toMatchObject({ code: 'organization_not_found' })
  })
})
