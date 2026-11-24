import type { BackOfficeUser } from '@repo/contracts'
import { fireEvent, screen, within } from '@solidjs/testing-library'
import { type Fetch, renderBackOffice } from '../../../../test-back-office'
import { BackOfficeUsersPage } from './back-office-users-page'

const user = (id: string, over: Partial<BackOfficeUser> = {}): BackOfficeUser => ({
  id,
  name: `Name ${id}`,
  email: `${id}@example.test`,
  createdAt: '2026-11-01T09:00:00.000Z',
  lastSignInAt: '2026-11-19T09:00:00.000Z',
  twoFactor: true,
  organizations: [{ id: 'org-1', name: 'Acme', slug: 'acme', role: 'owner' }],
  ...over
})

function renderPage(items: BackOfficeUser[], total = items.length) {
  const api = vi.fn<Fetch>(async () => Response.json({ items, total, page: 1, pageSize: 20 }))
  renderBackOffice({ at: '/admin/users', routes: [{ path: '/admin/users', component: BackOfficeUsersPage }], api })
  return api
}

describe('BackOfficeUsersPage (ADR 0077)', () => {
  it('lists every user with their last sign-in, two-step verification and organizations', async () => {
    renderPage([user('ada'), user('bob', { lastSignInAt: null, twoFactor: false, organizations: [] })])

    const section = within(await screen.findByRole('region', { name: 'Every user' }))
    expect(section.getByText('ada@example.test · last sign-in Nov 19, 2026 · Acme (Owner)')).toBeInTheDocument()
    expect(section.getAllByText('Two-step on')).toHaveLength(1)
    expect(section.getByText('bob@example.test · no sign-in in 30 days · No organization')).toBeInTheDocument()
  })

  it('says when there is none yet, and when a search finds none', async () => {
    renderPage([])

    expect(await screen.findByText('No user yet')).toBeInTheDocument()
    fireEvent.input(screen.getByLabelText('Find by email or name'), { target: { value: 'zed' } })
    fireEvent.click(screen.getByRole('button', { name: 'Find' }))
    expect(await screen.findByText('No user matches “zed”.')).toBeInTheDocument()
  })

  it('pages a long list', async () => {
    renderPage([user('ada')], 30)

    expect(await screen.findByRole('navigation', { name: 'Users' })).toBeInTheDocument()
  })

  it('says what could not be read', async () => {
    renderBackOffice({
      at: '/admin/users',
      routes: [{ path: '/admin/users', component: BackOfficeUsersPage }],
      api: async () => Response.json({ code: 'boom' }, { status: 500 })
    })

    expect(
      await screen.findByText('We could not load the back office. Check your connection, then try again.')
    ).toBeInTheDocument()
  })
})
