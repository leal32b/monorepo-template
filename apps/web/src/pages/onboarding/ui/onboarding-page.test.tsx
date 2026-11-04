import { createMemoryHistory, MemoryRouter, Route } from '@solidjs/router'
import { fireEvent, render, screen, waitFor, within } from '@solidjs/testing-library'
import { OrganizationsProvider } from '#entities/organizations'
import { ApiProvider, AuthProvider, createApiClient, createAuthClient } from '#shared/api'
import { I18nProvider } from '#shared/config'
import { OnboardingPage } from './onboarding-page'

type Fetch = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>

const health = { status: 'ok', service: 'api', timestamp: '2026-10-17T12:00:00.000Z', database: 'up' }
const api = createApiClient({ fetch: async () => Response.json(health) })

const day = 24 * 60 * 60 * 1000
const invitation = (id: string, name: string, expiresIn: number) => ({
  id,
  email: 'ada@example.com',
  role: 'member',
  status: 'pending',
  organizationId: `org-${id}`,
  organizationName: name,
  inviterId: 'u2',
  createdAt: '2026-11-01T12:00:00.000Z',
  expiresAt: new Date(Date.now() + expiresIn).toISOString()
})

/** Better Auth for a user with `invitations`; every other call answers as `others` says. */
function auth(invitations: unknown[] | (() => Response), others: Record<string, () => Response> = {}) {
  const fetch = vi.fn<Fetch>(async (input) => {
    const path = new URL(String(input)).pathname.replace('/api/auth/organization/', '')
    if (path === 'list-user-invitations') {
      return typeof invitations === 'function' ? invitations() : Response.json(invitations)
    }
    return others[path]?.() ?? Response.json([])
  })
  return { fetch, client: createAuthClient({ fetch }) }
}

function renderPage(client: ReturnType<typeof createAuthClient>) {
  const history = createMemoryHistory()
  history.set({ value: '/onboarding' })
  render(() => (
    <I18nProvider locale="en">
      <ApiProvider client={api}>
        <AuthProvider client={client}>
          <MemoryRouter history={history}>
            <Route path="/" component={OrganizationsProvider}>
              <Route path="/onboarding" component={OnboardingPage} />
              <Route path="/" component={() => <p>The root</p>} />
            </Route>
          </MemoryRouter>
        </AuthProvider>
      </ApiProvider>
    </I18nProvider>
  ))
  return history
}

describe('OnboardingPage', () => {
  beforeEach(() => localStorage.clear())

  it('without invitations, asks for the name of the first organization', async () => {
    renderPage(auth([]).client)

    expect(await screen.findByRole('heading', { level: 1, name: 'Name your organization' })).toBeInTheDocument()
    expect(screen.getByRole('textbox', { name: 'Organization name' })).toBeInTheDocument()
    expect(screen.queryByRole('region', { name: 'Invitations' })).not.toBeInTheDocument()
  })

  it('after creating it, remembers it on the device and goes to the start, which opens it', async () => {
    const created = () => Response.json({ id: 'org-1', name: 'Acme Inc', slug: 'acme-inc', members: [] })
    const history = renderPage(auth([], { create: created }).client)

    fireEvent.input(await screen.findByRole('textbox', { name: 'Organization name' }), {
      target: { value: 'Acme Inc' }
    })
    fireEvent.click(screen.getByRole('button', { name: 'Create organization' }))

    expect(await screen.findByText('The root')).toBeInTheDocument()
    expect(history.get()).toBe('/')
    expect(localStorage.getItem('organization')).toBe('acme-inc')
  })

  it('puts the open invitations first, leaves out the expired ones, and still offers to create one', async () => {
    renderPage(
      auth([invitation('1', 'Acme', 7 * day), invitation('2', 'Old Co', -day), invitation('3', 'Globex', 2 * day)])
        .client
    )

    expect(await screen.findByRole('heading', { level: 1, name: 'You have invitations' })).toBeInTheDocument()
    const region = within(screen.getByRole('region', { name: 'Invitations' }))
    expect(region.getByText('Acme')).toBeInTheDocument()
    expect(region.getByText('Globex')).toBeInTheDocument()
    expect(screen.queryByText('Old Co')).not.toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 2, name: 'Or create your own organization' })).toBeInTheDocument()
    expect(screen.getByRole('textbox', { name: 'Organization name' })).toBeInTheDocument()
  })

  it('opens each invitation on its own page, the one place an invitation is answered', async () => {
    renderPage(auth([invitation('1', 'Acme', 7 * day)]).client)

    const region = within(await screen.findByRole('region', { name: 'Invitations' }))

    expect(region.getByRole('link', { name: 'View invitation' })).toHaveAttribute('href', '/invitations/1')
    expect(region.queryByRole('button', { name: /Accept|Decline/ })).not.toBeInTheDocument()
  })

  it('for someone who has an organization, offers another one, with the way back to the app', async () => {
    renderPage(auth([], { list: () => Response.json([{ id: 'org-1', name: 'Acme', slug: 'acme' }]) }).client)

    expect(await screen.findByRole('heading', { level: 1, name: 'Create an organization' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Back to app' })).toHaveAttribute('href', '/')
  })

  it('asked for from the switcher, stays about creating, with the invitations after the form', async () => {
    renderPage(
      auth([invitation('1', 'Globex', 7 * day)], {
        list: () => Response.json([{ id: 'org-1', name: 'Acme', slug: 'acme' }])
      }).client
    )

    expect(await screen.findByRole('heading', { level: 1, name: 'Create an organization' })).toBeInTheDocument()
    const name = screen.getByRole('textbox', { name: 'Organization name' })
    const region = screen.getByRole('region', { name: 'Invitations' })
    expect(name.compareDocumentPosition(region) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Back to app' })).toBeInTheDocument()
  })

  it('for someone without one, has no way back: there is no app to go back to yet', async () => {
    renderPage(auth([]).client)

    await screen.findByRole('heading', { level: 1, name: 'Name your organization' })

    expect(screen.queryByRole('link', { name: 'Back to app' })).not.toBeInTheDocument()
  })

  it('waits for the invitations before it says anything, so an invited user is not asked to name an organization', async () => {
    let answer: (response: Response) => void = () => {}
    const fetch = vi.fn<Fetch>(async (input) =>
      String(input).endsWith('/list-user-invitations')
        ? new Promise<Response>((resolve) => {
            answer = resolve
          })
        : Response.json([])
    )
    renderPage(createAuthClient({ fetch }))

    await waitFor(() => expect(fetch).toHaveBeenCalled())
    expect(screen.queryByRole('heading', { level: 1 })).not.toBeInTheDocument()
    answer(Response.json([invitation('1', 'Acme', 7 * day)]))

    expect(await screen.findByRole('heading', { level: 1, name: 'You have invitations' })).toBeInTheDocument()
  })

  it('when the invitations cannot be read, says so and offers to try again, instead of a form that could strand an invitation', async () => {
    let failing = true
    const { client } = auth(() =>
      failing ? Response.json({ code: 'BOOM' }, { status: 500 }) : Response.json([invitation('1', 'Acme', 7 * day)])
    )
    renderPage(client)

    expect(
      await screen.findByRole('heading', { level: 1, name: 'We could not check your invitations' })
    ).toBeInTheDocument()
    expect(screen.queryByRole('textbox', { name: 'Organization name' })).not.toBeInTheDocument()
    failing = false
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }))

    expect(await screen.findByRole('heading', { level: 1, name: 'You have invitations' })).toBeInTheDocument()
  })
})
