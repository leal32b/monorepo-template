import { createMemoryHistory, MemoryRouter, Route } from '@solidjs/router'
import { fireEvent, render, screen, waitFor } from '@solidjs/testing-library'
import { ApiProvider, AuthProvider, createApiClient, createAuthClient } from '#shared/api'
import { I18nProvider } from '#shared/config'
import { SignInPage } from './sign-in-page'

type Fetch = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>

/** The sign-in page at `path`, in a router that has somewhere else to go, with Google on. */
function renderPage(
  path: string,
  fetch: Fetch = async () => Response.json({ redirect: false, token: 'session', user: { id: 'u1' } })
) {
  const history = createMemoryHistory()
  history.set({ value: path })
  const api = createApiClient({ fetch: async () => Response.json({ google: true }) })
  render(() => (
    <I18nProvider locale="en">
      <ApiProvider client={api}>
        <AuthProvider client={createAuthClient({ fetch })}>
          <MemoryRouter history={history}>
            <Route path="/login" component={SignInPage} />
            <Route path="*" component={() => <p>Somewhere else</p>} />
          </MemoryRouter>
        </AuthProvider>
      </ApiProvider>
    </I18nProvider>
  ))
  return history
}

const type = (field: HTMLElement, value: string) => fireEvent.input(field, { target: { value } })

function signIn() {
  type(screen.getByRole('textbox', { name: 'Email' }), 'ada@example.com')
  type(screen.getByLabelText('Password'), 'correct horse battery staple')
  fireEvent.click(screen.getByRole('button', { name: 'Sign in' }))
}

describe('SignInPage', () => {
  afterEach(() => vi.restoreAllMocks())

  it('opens on the sign-in form, with a way to create an account instead', () => {
    renderPage('/login')

    expect(screen.getByRole('heading', { level: 1, name: 'Sign in' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Sign in' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Create an account' })).toHaveAttribute('href', '/signup')
  })

  it('offers to reset a forgotten password', () => {
    renderPage('/login')

    expect(screen.getByRole('link', { name: 'Forgot your password?' })).toHaveAttribute('href', '/forgot-password')
  })

  it('after signing in, goes where the user was headed, and Back does not return to the form', async () => {
    const history = renderPage('/login?next=%2Fprojects%3Ftab%3Dmembers')

    signIn()

    await waitFor(() => expect(history.get()).toBe('/projects?tab=members'))
    history.back()
    expect(history.get()).toBe('/')
  })

  it('goes home instead when the link it came from points to another site (T11)', async () => {
    const history = renderPage('/login?next=https%3A%2F%2Fevil.example')

    signIn()

    await waitFor(() => expect(history.get()).toBe('/'))
  })

  it('sends the confirmation link again from the sign-in, when the email is not confirmed yet', async () => {
    const fetch = vi.fn<Fetch>(async (input) =>
      String(input).endsWith('/sign-in/email')
        ? Response.json({ code: 'EMAIL_NOT_VERIFIED' }, { status: 403 })
        : Response.json({ status: true })
    )
    renderPage('/login', fetch)

    signIn()
    fireEvent.click(await screen.findByRole('button', { name: 'Send it again' }))

    expect(await screen.findByRole('status')).toHaveTextContent('We sent it again.')
    expect(JSON.parse(String(fetch.mock.lastCall?.[1]?.body))).toMatchObject({ email: 'ada@example.com' })
  })

  it('offers Google too, to come back to where the user was headed', async () => {
    const assign = vi.spyOn(window.location, 'assign').mockImplementation(() => {})
    const fetch = vi.fn<Fetch>(async () => Response.json({ url: 'https://accounts.google.com/', redirect: false }))
    renderPage('/login?next=%2Fprojects', fetch)

    fireEvent.click(screen.getByRole('button', { name: 'Continue with Google' }))

    await waitFor(() => expect(assign).toHaveBeenCalled())
    expect(JSON.parse(String(fetch.mock.calls[0]?.[1]?.body))).toMatchObject({ callbackURL: '/projects' })
  })

  it('shows what Google sign-in came back with', async () => {
    renderPage('/login?error=email_not_verified')

    expect(await screen.findByRole('alert')).toHaveTextContent('Google has not confirmed this email address.')
  })

  it('takes an account with a second step to it, still headed where the user was going', async () => {
    const history = renderPage('/login?next=%2Fprojects', async () =>
      Response.json({ twoFactorRedirect: true, twoFactorMethods: ['totp'] })
    )

    signIn()

    await waitFor(() => expect(history.get()).toBe('/login/two-factor?next=%2Fprojects'))
  })

  it('explains a confirmation link that came back expired, and not as a Google error', async () => {
    renderPage('/login?next=%2F&error=TOKEN_EXPIRED')

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'This confirmation link has expired. Sign in, and you can ask for a new one.'
    )
    await screen.findByRole('button', { name: 'Continue with Google' })
    expect(screen.getAllByRole('alert')).toHaveLength(1)
  })
})
