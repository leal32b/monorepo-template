import { createMemoryHistory, MemoryRouter, Route } from '@solidjs/router'
import { fireEvent, render, screen, waitFor } from '@solidjs/testing-library'
import { OrganizationsProvider } from '#entities/organizations'
import { SessionProvider } from '#entities/sessions'
import { ApiProvider, AuthProvider, createApiClient, createAuthClient } from '#shared/api'
import { I18nProvider } from '#shared/config'
import { InvitationPage } from './invitation-page'

type Fetch = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>
type ApiFetch = (input: string, init?: RequestInit) => Promise<Response>

const ada = { id: 'u1', email: 'ada@example.com', name: 'Ada Lovelace' }
const health = { status: 'ok', service: 'api', timestamp: '2026-10-17T12:00:00.000Z', database: 'up' }

const invitation = (changes: Record<string, unknown> = {}) => ({
  id: 'inv-1',
  organizationName: 'Acme',
  organizationSlug: 'acme',
  inviterName: 'Grace Hopper',
  status: 'pending',
  expiresAt: '2026-11-11T12:00:00.000Z',
  member: false,
  ...changes
})

const problem = (status: number, code: string) => () => Response.json({ code }, { status })

/** The API answers the invitation as `answers` says, one call after another; the last answer repeats. */
function apiFor(...answers: (() => Response)[]) {
  let call = 0
  return vi.fn<ApiFetch>(async (path) => {
    if (path === '/api/health') return Response.json(health)
    const answer = answers[Math.min(call++, answers.length - 1)] as () => Response
    return answer()
  })
}

/** Better Auth: no organizations, and every other call answers as `others` says. */
function authFor(others: Record<string, () => Response> = {}) {
  return vi.fn<Fetch>(async (input) => {
    const path = new URL(String(input)).pathname.replace('/api/auth/', '')
    return others[path]?.() ?? Response.json([])
  })
}

function renderPage(api: ApiFetch, auth: Fetch = authFor(), path = '/invitations/inv-1') {
  const history = createMemoryHistory()
  history.set({ value: path })
  render(() => (
    <I18nProvider locale="en">
      <ApiProvider client={createApiClient({ fetch: api })}>
        <AuthProvider client={createAuthClient({ fetch: auth })}>
          <SessionProvider user={ada}>
            <MemoryRouter history={history}>
              <Route path="/" component={OrganizationsProvider}>
                <Route path="/invitations/:id" component={InvitationPage} />
                <Route path="/acme" component={() => <p>Acme home</p>} />
                <Route path="/" component={() => <p>The start</p>} />
              </Route>
              <Route path="/login" component={() => <p>The sign-in</p>} />
            </MemoryRouter>
          </SessionProvider>
        </AuthProvider>
      </ApiProvider>
    </I18nProvider>
  ))
  return history
}

const heading = (name: string) => screen.findByRole('heading', { level: 1, name })

describe('InvitationPage', () => {
  beforeEach(() => localStorage.clear())

  it('asks the API about the invitation of the link', async () => {
    const api = apiFor(() => Response.json(invitation()))
    renderPage(api)

    await heading('Join Acme')
    expect(api.mock.calls.map(([path]) => path)).toContain('/api/invitations/inv-1')
  })

  it('offers an open invitation, saying who sent it, until when, and who is signed in', async () => {
    renderPage(apiFor(() => Response.json(invitation())))

    expect(await heading('Join Acme')).toBeInTheDocument()
    expect(screen.getByText('Grace Hopper invited you. The invitation is open until November 11, 2026.')).toBeVisible()
    expect(screen.getByText(/Signed in as ada@example.com/)).toBeVisible()
    expect(screen.getByRole('button', { name: 'Join Acme' })).toBeVisible()
  })

  it('after joining, remembers the organization on the device and opens it, with the list read again', async () => {
    const auth = authFor({ 'organization/accept-invitation': () => Response.json({ member: { id: 'm1' } }) })
    const history = renderPage(
      apiFor(() => Response.json(invitation())),
      auth
    )

    fireEvent.click(await screen.findByRole('button', { name: 'Join Acme' }))

    expect(await screen.findByText('Acme home')).toBeInTheDocument()
    expect(history.get()).toBe('/acme')
    expect(localStorage.getItem('organization')).toBe('acme')
    const lists = () => auth.mock.calls.filter(([input]) => String(input).endsWith('/organization/list'))
    await waitFor(() => expect(lists()).toHaveLength(2))
  })

  it('after declining, says so and who to ask, with a way on to the app', async () => {
    const auth = authFor({ 'organization/reject-invitation': () => Response.json({ invitation: {} }) })
    renderPage(
      apiFor(() => Response.json(invitation())),
      auth
    )

    fireEvent.click(await screen.findByRole('button', { name: 'Decline' }))

    expect(await heading('You declined this invitation')).toBeInTheDocument()
    expect(screen.getByText('Changed your mind? Ask Grace Hopper to invite you again.')).toBeVisible()
    expect(screen.getByRole('link', { name: 'Continue to the app' })).toHaveAttribute('href', '/')
  })

  it('reads the invitation again when it closed while the screen was open, and says what became of it', async () => {
    const auth = authFor({
      'organization/accept-invitation': () => Response.json({ code: 'INVITATION_NOT_FOUND' }, { status: 400 })
    })
    renderPage(
      apiFor(
        () => Response.json(invitation()),
        () => Response.json(invitation({ status: 'withdrawn' }))
      ),
      auth
    )

    fireEvent.click(await screen.findByRole('button', { name: 'Join Acme' }))

    expect(await heading('This invitation was withdrawn')).toBeInTheDocument()
    expect(
      screen.getByText(
        'Grace Hopper may have sent you a newer one: look for the latest email about Acme. If there is none, ask Grace Hopper.'
      )
    ).toBeVisible()
  })

  it('opens the organization of an invitation accepted before', async () => {
    renderPage(apiFor(() => Response.json(invitation({ status: 'accepted', member: true }))))

    expect(await heading('You are in Acme')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Open Acme' })).toHaveAttribute('href', '/acme')
  })

  it('says an accepted invitation of someone no longer in the organization was used, and who to ask', async () => {
    renderPage(apiFor(() => Response.json(invitation({ status: 'accepted', member: false }))))

    expect(await heading('This invitation was already used')).toBeInTheDocument()
    expect(screen.getByText(/Ask Grace Hopper to invite you again/)).toBeVisible()
  })

  it('says an expired invitation lasts 7 days, and who to ask for a new one', async () => {
    renderPage(apiFor(() => Response.json(invitation({ status: 'expired' }))))

    expect(await heading('This invitation expired')).toBeInTheDocument()
    expect(screen.getByText('Invitations last 7 days. Ask Grace Hopper to send you a new one.')).toBeVisible()
  })

  it('says a link that leads nowhere may be cut short', async () => {
    renderPage(apiFor(problem(404, 'invitation_not_found')))

    expect(await heading('We could not find this invitation')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Continue to the app' })).toBeVisible()
  })

  it('for another account, says who is signed in and signs out to come back with the invited one', async () => {
    const auth = authFor({ 'sign-out': () => Response.json({ success: true }) })
    const history = renderPage(apiFor(problem(403, 'not_the_recipient')), auth)

    expect(await heading('This invitation is for another address')).toBeInTheDocument()
    expect(screen.getByText(/You are signed in as ada@example.com/)).toBeVisible()
    fireEvent.click(screen.getByRole('button', { name: 'Sign in with another account' }))

    expect(await screen.findByText('The sign-in')).toBeInTheDocument()
    expect(history.get()).toBe('/login?next=%2Finvitations%2Finv-1')
  })

  it('from an open invitation too, offers another account', async () => {
    const auth = authFor({ 'sign-out': () => Response.json({ success: true }) })
    const history = renderPage(
      apiFor(() => Response.json(invitation())),
      auth
    )

    fireEvent.click(await screen.findByRole('button', { name: 'Use another account' }))

    await waitFor(() => expect(history.get()).toBe('/login?next=%2Finvitations%2Finv-1'))
  })

  it('says when signing out failed, and stays', async () => {
    const auth = authFor({ 'sign-out': () => Response.json({ code: 'BOOM' }, { status: 500 }) })
    renderPage(apiFor(problem(403, 'not_the_recipient')), auth)

    fireEvent.click(await screen.findByRole('button', { name: 'Sign in with another account' }))

    expect(await screen.findByRole('alert')).toBeInTheDocument()
  })

  it('says when the invitation cannot be read, and reads it again on request', async () => {
    renderPage(
      apiFor(
        () => {
          throw new TypeError('Failed to fetch')
        },
        () => Response.json(invitation())
      )
    )

    expect(await heading('We could not open this invitation')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }))

    expect(await heading('Join Acme')).toBeInTheDocument()
  })
})
