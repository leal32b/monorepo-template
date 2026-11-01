import { createMemoryHistory, MemoryRouter, Route } from '@solidjs/router'
import { fireEvent, render, screen, waitFor, within } from '@solidjs/testing-library'
import { SessionProvider } from '#entities/sessions'
import { ApiProvider, AuthProvider, createApiClient, createAuthClient } from '#shared/api'
import { I18nProvider } from '#shared/config'
import { AccountPage } from './account-page'

type Fetch = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>

const ada = { id: 'u1', email: 'ada@example.com', name: 'Ada Lovelace' }

const totpURI = 'otpauth://totp/Monorepo%20Template:ada%40example.com?secret=JBSWY3DPEHPK3PXP'
const backupCodes = ['a8Kd2-Xm9Qz', 'b7Le3-Yn8Ra']

/**
 * Better Auth answering for a user with these accounts and this second step; turning it on gives an
 * app to set up, unless `enable` answers otherwise, and takes any code.
 */
function betterAuth(
  providers: string[],
  twoFactorEnabled: boolean,
  enable = () => Response.json({ method: 'totp', totpURI, backupCodes })
) {
  return vi.fn<Fetch>(async (input) => {
    const url = String(input)
    if (url.includes('/list-accounts')) {
      return Response.json(providers.map((providerId, index) => ({ id: `a${index}`, providerId })))
    }
    if (url.endsWith('/api/identity/options')) return Response.json({ google: true })
    if (url.endsWith('/two-factor/enable')) return enable()
    if (url.endsWith('/two-factor/verify-totp')) return Response.json({ status: true })
    return Response.json({ session: { id: 's1' }, user: { ...ada, twoFactorEnabled } })
  })
}

const health = { status: 'ok', service: 'api', timestamp: '2026-10-17T12:00:00.000Z', database: 'up' }

/** The page at `path`, behind a session, with Better Auth answering through `fetch` and the API well. */
function renderPage(fetch: Fetch, path = '/account') {
  /** The shell asks the API how it is; the page's own calls go to `fetch`. */
  const answer: Fetch = async (input, init) =>
    String(input).endsWith('/api/health') ? Response.json(health) : fetch(input, init)
  const history = createMemoryHistory()
  history.set({ value: path })
  render(() => (
    <I18nProvider locale="en">
      <ApiProvider client={createApiClient({ fetch: answer })}>
        <AuthProvider client={createAuthClient({ fetch })}>
          <SessionProvider user={ada}>
            <MemoryRouter history={history}>
              <Route path="/account" component={AccountPage} />
              <Route path="/login" component={() => <p>The sign-in</p>} />
            </MemoryRouter>
          </SessionProvider>
        </AuthProvider>
      </ApiProvider>
    </I18nProvider>
  ))
  return history
}

/** The section of the page named by its heading. */
const section = (name: string) => screen.getByRole('region', { name })

const type = (field: HTMLElement, value: string) => fireEvent.input(field, { target: { value } })

/** Confirms the password in the two-step verification section. */
function setUp() {
  const twoFactor = section('Two-step verification')
  type(within(twoFactor).getByLabelText('Your password'), 'my password')
  fireEvent.click(within(twoFactor).getByRole('button', { name: 'Set up' }))
  return twoFactor
}

describe('AccountPage', () => {
  it('says how the account signs in, and that the second step is on', async () => {
    renderPage(betterAuth(['credential', 'google'], true))

    expect(screen.getByRole('heading', { level: 1, name: 'Account security' })).toBeInTheDocument()
    expect(await screen.findByText('You sign in with your email and a password.')).toBeInTheDocument()
    expect(within(section('Two-step verification')).getByText(/^On:/)).toBeInTheDocument()
    expect(within(section('Password')).getByLabelText('Current password')).toBeInTheDocument()
    expect(within(section('Password')).getByText(/signs you out on your other devices/)).toBeInTheDocument()
  })

  it('says when the second step is off, and offers to turn it on', async () => {
    renderPage(betterAuth(['credential'], false))

    expect(await screen.findByText('Off: signing in asks only for your password.')).toBeInTheDocument()
    expect(within(section('Two-step verification')).getByRole('button', { name: 'Set up' })).toBeInTheDocument()
  })

  it('turns the second step on with the app, then shows the backup codes until they are saved', async () => {
    renderPage(betterAuth(['credential'], false))
    await screen.findByText('Off: signing in asks only for your password.')

    const twoFactor = setUp()
    type(await within(twoFactor).findByLabelText('6-digit code'), '123456')
    fireEvent.click(within(twoFactor).getByRole('button', { name: 'Turn on' }))

    expect(await within(twoFactor).findByText('Two-step verification is on.')).toHaveFocus()
    expect(within(twoFactor).getByText(/^On:/)).toBeInTheDocument()
    expect(within(twoFactor).queryByLabelText('6-digit code')).not.toBeInTheDocument()
    fireEvent.click(within(twoFactor).getByRole('button', { name: 'I saved them' }))
    expect(within(twoFactor).queryByRole('list', { name: 'Backup codes' })).not.toBeInTheDocument()
    expect(within(twoFactor).getByText(/^On:/)).toHaveFocus()
  })

  it('shows the second step on when it was turned on elsewhere meanwhile', async () => {
    renderPage(
      betterAuth(['credential'], false, () => Response.json({ code: 'TOTP_ALREADY_ENABLED' }, { status: 400 }))
    )
    await screen.findByText('Off: signing in asks only for your password.')

    const twoFactor = setUp()

    expect(await within(twoFactor).findByText(/^On:/)).toHaveFocus()
    expect(within(twoFactor).queryByRole('button', { name: 'Set up' })).not.toBeInTheDocument()
  })

  it('says an account made with Google alone has no password, and sends the link to create one', async () => {
    renderPage(betterAuth(['google'], false))

    expect(await screen.findByText('Your account has no password: you sign in with Google.')).toBeInTheDocument()
    expect(within(section('Two-step verification')).getByText(/needs one first/)).toBeInTheDocument()
    expect(within(section('Two-step verification')).queryByRole('button', { name: 'Set up' })).not.toBeInTheDocument()
    fireEvent.click(within(section('Password')).getByRole('button', { name: 'Create a password' }))

    expect(await screen.findByRole('status')).toHaveTextContent('We sent a link to ada@example.com')
  })

  it('says, in the Google section, why linking Google failed', async () => {
    renderPage(betterAuth(['credential'], false), '/account?error=account_already_linked_to_different_user')

    const google = await screen.findByRole('region', { name: 'Google' })
    expect(within(google).getByRole('alert')).toHaveTextContent(
      'That Google account already signs in to another account here.'
    )
  })

  it('sends the user to sign in when the session has ended, to come back here', async () => {
    const history = renderPage(async () => Response.json({ code: 'UNAUTHORIZED' }, { status: 401 }))

    await waitFor(() => expect(history.get()).toBe('/login?next=%2Faccount'))
  })

  it('says when the account cannot be read, and tries again on request', async () => {
    const answers = betterAuth(['credential'], false)
    const fetch = vi.fn<Fetch>().mockRejectedValueOnce(new TypeError('Failed to fetch')).mockImplementation(answers)
    renderPage(fetch)

    expect(await screen.findByRole('alert')).toHaveTextContent('We could not load your account security.')
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }))

    expect(await screen.findByText('Off: signing in asks only for your password.')).toBeInTheDocument()
  })
})
