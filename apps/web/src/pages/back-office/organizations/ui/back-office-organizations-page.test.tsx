import type { BackOfficeOrganization } from '@repo/contracts'
import { fireEvent, screen, within } from '@solidjs/testing-library'
import { type Fetch, renderBackOffice } from '../../../../test-back-office'
import { BackOfficeOrganizationsPage } from './back-office-organizations-page'

const organization = (id: string, over: Partial<BackOfficeOrganization> = {}): BackOfficeOrganization => ({
  id,
  name: `Name ${id}`,
  slug: id,
  createdAt: '2026-11-01T09:00:00.000Z',
  subscription: { status: 'active', access: 'full', plan: 'pro' },
  owner: { id: 'u-1', name: 'Olivia', email: 'olivia@example.test' },
  members: 3,
  ...over
})

function renderPage(items: BackOfficeOrganization[], total = items.length) {
  const api = vi.fn<Fetch>(async (path) =>
    Response.json({ items, total, page: Number(new URL(path, 'http://x').searchParams.get('page')), pageSize: 20 })
  )
  renderBackOffice({
    at: '/admin/organizations',
    routes: [{ path: '/admin/organizations', component: BackOfficeOrganizationsPage }],
    api
  })
  return api
}

describe('BackOfficeOrganizationsPage (ADR 0077)', () => {
  it('lists every organization with its plan, its owner, its size, and the way to its page', async () => {
    renderPage([
      organization('acme'),
      organization('beta', {
        subscription: { status: 'cancelled', access: 'read-only', plan: null },
        owner: null,
        members: 1
      })
    ])

    expect(await screen.findByRole('heading', { level: 1, name: 'Organizations' })).toBeInTheDocument()
    const section = within(await screen.findByRole('region', { name: 'Every organization' }))
    expect(section.getByText('Active')).toBeInTheDocument()
    expect(
      section.getByText('Olivia · olivia@example.test · /acme · 3 members · created Nov 1, 2026')
    ).toBeInTheDocument()
    expect(section.getByText('Ended · Read only')).toBeInTheDocument()
    expect(section.getByText('No owner · /beta · 1 member · created Nov 1, 2026')).toBeInTheDocument()
    expect(section.getByRole('link', { name: 'Open: Name acme' })).toHaveAttribute('href', '/admin/organizations/acme')
  })

  it('says when there is none yet, and when a search finds none', async () => {
    const api = renderPage([])

    expect(await screen.findByText('No organization yet')).toBeInTheDocument()
    fireEvent.input(screen.getByLabelText('Find by name, address or owner’s email'), { target: { value: 'zzz' } })
    fireEvent.click(screen.getByRole('button', { name: 'Find' }))
    expect(await screen.findByText('No organization matches “zzz”.')).toBeInTheDocument()
    expect(api).toHaveBeenLastCalledWith('/api/admin/organizations?page=1&search=zzz', expect.anything())
  })

  it('moves through the pages', async () => {
    const api = renderPage([organization('acme')], 45)

    fireEvent.click(await screen.findByRole('button', { name: 'Next' }))

    expect(await screen.findByText('Page 2 of 3')).toBeInTheDocument()
    expect(api).toHaveBeenLastCalledWith('/api/admin/organizations?page=2', expect.anything())
  })

  it('says what could not be read, and waits with the list’s skeleton meanwhile', async () => {
    let fail: () => void = () => undefined
    renderBackOffice({
      at: '/admin/organizations',
      routes: [{ path: '/admin/organizations', component: BackOfficeOrganizationsPage }],
      api: () =>
        new Promise((resolve) => {
          fail = () => resolve(Response.json({ code: 'boom' }, { status: 500 }))
        })
    })

    expect(await screen.findByText('Loading…')).toBeInTheDocument()
    fail()
    expect(
      await screen.findByText('We could not load the back office. Check your connection, then try again.')
    ).toBeInTheDocument()
  })
})
