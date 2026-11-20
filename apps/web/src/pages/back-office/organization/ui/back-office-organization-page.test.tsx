import type { BackOfficeOrganizationDetail } from '@repo/contracts'
import { fireEvent, screen, within } from '@solidjs/testing-library'
import { type Fetch, problem, renderBackOffice, visitToAcme } from '../../../../test-back-office'
import { BackOfficeOrganizationPage } from './back-office-organization-page'

const acme: BackOfficeOrganizationDetail = {
  id: 'org-1',
  name: 'Acme',
  slug: 'acme',
  createdAt: '2026-11-01T09:00:00.000Z',
  timeZone: 'America/Sao_Paulo',
  currency: 'BRL',
  subscription: {
    status: 'trialing',
    access: 'full',
    plan: null,
    nextPlan: null,
    trialEndsAt: '2026-11-15T09:00:00.000Z',
    periodStartsAt: null,
    paidThrough: null,
    pastDueSince: null,
    cancelAtPeriodEnd: false,
    checkout: null
  },
  members: [
    { id: 'u-1', name: 'Olivia', email: 'olivia@example.test', role: 'owner', joinedAt: '2026-11-01T09:00:00.000Z' },
    { id: 'u-2', name: 'Bob', email: 'bob@example.test', role: 'member,editor', joinedAt: '2026-11-02T09:00:00.000Z' }
  ]
}

function renderPage(api: Fetch) {
  return renderBackOffice({
    at: '/admin/organizations/org-1',
    routes: [{ path: '/admin/organizations/:organizationId', component: BackOfficeOrganizationPage }],
    api
  })
}

const reading =
  (enter: () => Promise<Response>, detail = acme): Fetch =>
  async (_path, init) =>
    init?.method === 'POST' ? enter() : Response.json(detail)

describe('BackOfficeOrganizationPage (ADR 0077)', () => {
  afterEach(() => window.localStorage.clear())

  it("shows the organization's state and members, their roles in words", async () => {
    renderPage(reading(async () => Response.json(visitToAcme)))

    const state = within(await screen.findByRole('region', { name: 'Acme' }))
    expect(state.getByText('Trial')).toBeInTheDocument()
    expect(state.getByText('No plan chosen yet')).toBeInTheDocument()
    expect(state.getByText('/acme')).toBeInTheDocument()
    expect(state.getByText('America/Sao Paulo · BRL')).toBeInTheDocument()
    const members = within(screen.getByRole('region', { name: 'Members' }))
    expect(members.getByText('olivia@example.test · Owner · joined Nov 1, 2026')).toBeInTheDocument()
    expect(members.getByText('bob@example.test · Member, Editor · joined Nov 2, 2026')).toBeInTheDocument()
  })

  it('names the plan an organization pays for', async () => {
    renderPage(
      reading(async () => Response.json(visitToAcme), {
        ...acme,
        subscription: { ...acme.subscription, status: 'active', plan: 'pro' }
      })
    )

    expect(await screen.findByText('Pro')).toBeInTheDocument()
  })

  it('enters the organization as its owner sees it, and opens its start', async () => {
    renderPage(reading(async () => Response.json(visitToAcme, { status: 201 })))

    fireEvent.click(await screen.findByRole('button', { name: 'Enter' }))

    expect(await screen.findByText('Elsewhere: /acme')).toBeInTheDocument()
    expect(window.localStorage.getItem('impersonation')).toBe('on')
  })

  it('says to leave another organization first, and any other failure', async () => {
    let refusal = problem(409, 'impersonation_active')
    renderPage(reading(async () => refusal))

    fireEvent.click(await screen.findByRole('button', { name: 'Enter' }))
    expect(await screen.findByText('You are inside another organization. Leave it first.')).toBeInTheDocument()
    refusal = problem(503, 'service_unavailable')
    fireEvent.click(screen.getByRole('button', { name: 'Enter' }))
    expect(await screen.findByText('Could not enter. Check your connection and try again.')).toBeInTheDocument()
  })

  it('says when no organization has the address, and what could not be read otherwise', async () => {
    renderPage(async () => problem(404, 'organization_not_found'))
    expect(await screen.findByText('No organization has this address. It may have been deleted.')).toBeInTheDocument()
  })

  it('offers to read again what failed', async () => {
    renderPage(async () => problem(500, 'internal_error'))
    expect(
      await screen.findByText('We could not load this organization. Check your connection, then try again.')
    ).toBeInTheDocument()
  })
})
