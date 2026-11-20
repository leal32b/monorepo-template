import { backOfficeOrganizationPageSchema, backOfficePageSize } from '@repo/contracts'
import { FixedClock } from '#libs/adapters/fixed-clock'
import { CountingIds } from '#libs/jobs/testing/jobs.contract'
import { anOrganization, InMemoryBackOffice } from '../../testing/in-memory-back-office'
import { ListOrganizationsService } from './list-organizations.service'

describe('ListOrganizationsService (ADR 0077)', () => {
  it('answers a page in the shape of the contract, with what the subscription lets members do now', async () => {
    const clock = new FixedClock(new Date('2026-12-01T00:00:00Z'))
    const backOffice = new InMemoryBackOffice(new CountingIds(), clock)
    backOffice.organizations.push(anOrganization('org-acme'))

    const page = await new ListOrganizationsService(backOffice, clock).execute({ page: 1, search: undefined })

    expect(backOfficeOrganizationPageSchema.parse(page)).toEqual(page)
    expect(page).toEqual({
      items: [
        {
          id: 'org-acme',
          name: 'Name of org-acme',
          slug: 'org-acme',
          createdAt: '2026-11-01T09:00:00.000Z',
          subscription: { status: 'trialing', access: 'read-only', plan: null },
          owner: { id: 'user-ada', name: 'Ada', email: 'ada@example.test' },
          members: 1
        }
      ],
      total: 1,
      page: 1,
      pageSize: backOfficePageSize
    })
  })
})
