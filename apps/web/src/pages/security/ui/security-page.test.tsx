import { createMemoryHistory, MemoryRouter, Route } from '@solidjs/router'
import { fireEvent, render, screen, waitFor, within } from '@solidjs/testing-library'
import { SessionProvider } from '#entities/sessions'
import { ApiProvider, AuthProvider, createApiClient, createAuthClient } from '#shared/api'
import { I18nProvider, PaletteProvider, ThemeProvider } from '#shared/config'
import { SecurityPage } from './security-page'

type Fetch = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>

const ada = { id: 'u1', email: 'ada@example.com', name: 'Ada Lovelace' }

const totpURI = 'otpauth://totp/Monorepo%20Template:ada%40example.com?secret=JBSWY3DPEHPK3PXP'
const backupCodes = ['a8Kd2-Xm9Qz', 'b7Le3-Yn8Ra']

/**
 * Better Auth answering for a user with these accounts and this second step. `answers` replaces the
 * answer to a route by the end of its path; turning the second step on gives an app to set up, and
 * the app's code, a password, a change and an unlink are taken as right.
 */
function betterAuth(
  providers: string[],
  twoFactorEnabled: boolean,
  answers: Record<string, () => Response> = {},
  google = true
) {
  return vi.fn<Fetch>(async (input) => {
    const url = String(input)
    const custom = Object.keys(answers).find((route) => url.endsWith(route))
    if (custom) return (answers[custom] as () => Response)()
    if (url.includes('/list-accounts')) {
      return Response.json(providers.map((providerId, index) => ({ id: `a${index}`, providerId })))
    }
    if (url.endsWith('/api/identity/options')) return Response.json({ google })
    if (url.endsWith('/two-factor/enable')) return Response.json({ method: 'totp', totpURI, backupCodes })
    if (url.endsWith('/two-factor/generate-backup-codes')) return Response.json({ status: true, backupCodes })
    if (url.endsWith('/two-factor/verify-totp') || url.endsWith('/two-factor/disable')) {
      return Response.json({ status: true })
    }
    if (url.endsWith('/change-password')) return Response.json({ token: 'session', user: { id: 'u1' } })
    if (url.endsWith('/unlink-account') || url.endsWith('/request-password-reset')) {
      return Response.json({ status: true })
    }
    return Response.json({ session: { id: 's1' }, user: { ...ada, twoFactorEnabled } })
  })
}

const health = { status: 'ok', service: 'api', timestamp: '2026-10-17T12:00:00.000Z', database: 'up' }

/** The page at `path`, behind a session, with Better Auth answering through `fetch` and the API well. */
function renderPage(fetch: Fetch, path = '/settings/security') {
  /** The shell asks the API how it is; the page's own calls go to `fetch`. */
  const answer: Fetch = async (input, init) =>
    String(input).endsWith('/api/health') ? Response.json(health) : fetch(input, init)
  const history = createMemoryHistory()
  history.set({ value: path })
  render(() => (
    <I18nProvider locale="en">
      <ThemeProvider>
        <PaletteProvider>
          <ApiProvider client={createApiClient({ fetch: answer })}>
            <AuthProvider client={createAuthClient({ fetch })}>
              <SessionProvider user={ada}>
                <MemoryRouter history={history}>
                  <Route path="/settings/security" component={SecurityPage} />
                  <Route path="/login" component={() => <p>The sign-in</p>} />
                </MemoryRouter>
              </SessionProvider>
            </AuthProvider>
          </ApiProvider>
        </PaletteProvider>
      </ThemeProvider>
    </I18nProvider>
  ))
  return history
}

/** The section of the page named by its heading. */
const section = (name: string) => screen.getByRole('region', { name })

/** The form a row opened, named for what it does. */
const form = (name: string) => screen.getByRole('group', { name })

const type = (field: HTMLElement, value: string) => fireEvent.input(field, { target: { value } })

const click = (name: string, within_ = screen) => fireEvent.click(within_.getByRole('button', { name }))

/** Confirms the password in the open form. */
function confirmWith(button: string) {
  type(screen.getByLabelText('Your password'), 'my password')
  click(button)
}

describe('SecurityPage', () => {
  it('is a page of two sections, each a group of rows', async () => {
    renderPage(betterAuth(['credential', 'google'], true))

    expect(screen.getByRole('heading', { level: 1, name: 'Security' })).toBeInTheDocument()
    const signIn = await screen.findByRole('region', { name: 'Ways to sign in' })
    expect(signIn).toHaveTextContent('How you get into your account.')
    expect(signIn).toHaveTextContent('You sign in with your email and a password.')
    expect(within(signIn).getByRole('button', { name: 'Change password' })).toBeInTheDocument()
    const twoFactor = section('Two-step verification')
    expect(twoFactor).toHaveTextContent('Authenticator app')
    expect(twoFactor).toHaveTextContent('On')
    expect(within(twoFactor).getByRole('button', { name: 'Turn off' })).toBeInTheDocument()
    expect(within(twoFactor).getByRole('button', { name: 'Get new codes' })).toBeInTheDocument()
  })

  it('says in a badge when the second step is off, and offers to turn it on', async () => {
    renderPage(betterAuth(['credential'], false))

    const twoFactor = await screen.findByRole('region', { name: 'Two-step verification' })
    expect(twoFactor).toHaveTextContent('Off')
    expect(twoFactor).toHaveTextContent('Signing in asks only for your password.')
    expect(within(twoFactor).getByRole('button', { name: 'Turn on' })).toBeInTheDocument()
    expect(twoFactor).toHaveTextContent('Available once two-step verification is on.')
    expect(within(twoFactor).queryByRole('button', { name: 'Get new codes' })).not.toBeInTheDocument()
  })

  describe('the password', () => {
    it('opens its form below the row, one at a time, and a cancelled form gives focus back', async () => {
      renderPage(betterAuth(['credential'], false))
      await screen.findByRole('button', { name: 'Change password' })

      click('Change password')

      expect(form('Change password')).toHaveFocus()
      expect(within(form('Change password')).getByLabelText('Current password')).toBeInTheDocument()
      expect(within(form('Change password')).getByText(/signs you out on your other devices/)).toBeInTheDocument()
      expect(screen.getAllByRole('button', { name: 'Change password' })).toHaveLength(1)
      expect(screen.getByRole('button', { name: 'Turn on' })).toBeDisabled()
      click('Cancel')
      expect(screen.queryByRole('group', { name: 'Change password' })).not.toBeInTheDocument()
      await waitFor(() => expect(screen.getByRole('button', { name: 'Change password' })).toHaveFocus())
      expect(screen.getByRole('button', { name: 'Turn on' })).toBeEnabled()
    })

    it('changes it, then says so in the row and gives focus back', async () => {
      renderPage(betterAuth(['credential'], false))
      await screen.findByRole('button', { name: 'Change password' })
      click('Change password')

      type(screen.getByLabelText('Current password'), 'an old password')
      type(screen.getByLabelText('New password'), 'correct horse battery staple')
      fireEvent.click(within(form('Change password')).getByRole('button', { name: 'Change password' }))

      await waitFor(() =>
        expect(section('Ways to sign in')).toHaveTextContent(
          'Your password was changed. Your other devices were signed out.'
        )
      )
      expect(screen.queryByRole('group', { name: 'Change password' })).not.toBeInTheDocument()
      await waitFor(() => expect(screen.getByRole('button', { name: 'Change password' })).toHaveFocus())
    })

    it('for an account made with Google alone, sends the link to create one and says where it went', async () => {
      renderPage(betterAuth(['google'], false))

      const signIn = await screen.findByRole('region', { name: 'Ways to sign in' })
      expect(signIn).toHaveTextContent('Not set up')
      expect(signIn).toHaveTextContent('Your account has no password: you sign in with Google.')
      fireEvent.click(within(signIn).getByRole('button', { name: 'Create a password' }))

      await waitFor(() => expect(signIn).toHaveTextContent('We sent a link to ada@example.com'))
    })

    it('says what went wrong sending the link', async () => {
      renderPage(betterAuth(['google'], false, { '/request-password-reset': () => Response.json({}, { status: 429 }) }))

      fireEvent.click(await screen.findByRole('button', { name: 'Create a password' }))

      expect(await screen.findByRole('alert')).toHaveTextContent('Too many attempts.')
    })

    it('forgets an old failure once the link is sent', async () => {
      const send = vi
        .fn<() => Response>()
        .mockReturnValueOnce(Response.json({}, { status: 429 }))
        .mockReturnValue(Response.json({ status: true }))
      renderPage(betterAuth(['google'], false, { '/request-password-reset': send }))
      fireEvent.click(await screen.findByRole('button', { name: 'Create a password' }))
      await screen.findByRole('alert')

      fireEvent.click(screen.getByRole('button', { name: 'Create a password' }))

      await waitFor(() => expect(screen.queryByRole('alert')).not.toBeInTheDocument())
      expect(section('Ways to sign in')).toHaveTextContent('We sent a link to ada@example.com')
    })
  })

  describe('turning two-step verification on', () => {
    it('goes in three steps: the password, the app, the codes, which have no way out until saved', async () => {
      renderPage(betterAuth(['credential'], false))
      await screen.findByRole('button', { name: 'Turn on' })

      click('Turn on')
      const steps = () =>
        within(screen.getByRole('list', { name: 'Turning on two-step verification' })).getAllByRole('listitem')
      expect(steps().map((step) => step.getAttribute('aria-current'))).toEqual(['step', null, null])
      expect(form('Turning on two-step verification')).toHaveFocus()
      confirmWith('Set up')
      type(await screen.findByLabelText('6-digit code'), '123456')
      expect(steps().map((step) => step.getAttribute('aria-current'))).toEqual([null, 'step', null])
      click('Turn on')

      expect(await screen.findByRole('list', { name: 'Backup codes' })).toBeInTheDocument()
      expect(steps().map((step) => step.getAttribute('aria-current'))).toEqual([null, null, 'step'])
      expect(screen.getByText('Two-step verification is on.')).toHaveFocus()
      expect(screen.queryByRole('button', { name: 'Cancel' })).not.toBeInTheDocument()
      expect(section('Two-step verification')).toHaveTextContent('On')
      click('I saved them')

      expect(screen.queryByRole('group', { name: 'Turning on two-step verification' })).not.toBeInTheDocument()
      expect(section('Two-step verification')).toHaveTextContent(
        'Done: signing in with your password now also asks for a code'
      )
      await waitFor(() => expect(screen.getByRole('button', { name: 'Turn off' })).toHaveFocus())
    })

    it('can be cancelled before the codes, and starts over the next time', async () => {
      renderPage(betterAuth(['credential'], false))
      await screen.findByRole('button', { name: 'Turn on' })
      click('Turn on')
      confirmWith('Set up')
      await screen.findByLabelText('6-digit code')

      click('Cancel')

      expect(screen.queryByRole('group', { name: 'Turning on two-step verification' })).not.toBeInTheDocument()
      await waitFor(() => expect(screen.getByRole('button', { name: 'Turn on' })).toHaveFocus())
      click('Turn on')
      expect(screen.getByLabelText('Your password')).toBeInTheDocument()
    })

    it('shows it on when it was turned on elsewhere meanwhile', async () => {
      renderPage(
        betterAuth(['credential'], false, {
          '/two-factor/enable': () => Response.json({ code: 'TOTP_ALREADY_ENABLED' }, { status: 400 })
        })
      )
      await screen.findByRole('button', { name: 'Turn on' })
      click('Turn on')

      confirmWith('Set up')

      await waitFor(() =>
        expect(section('Two-step verification')).toHaveTextContent('Done: signing in with your password now also asks')
      )
      expect(screen.getByRole('button', { name: 'Turn off' })).toBeInTheDocument()
    })

    it('says an account without a password needs one first, with nothing to press', async () => {
      renderPage(betterAuth(['google'], false))

      const twoFactor = await screen.findByRole('region', { name: 'Two-step verification' })
      expect(twoFactor).toHaveTextContent('needs one first')
      expect(within(twoFactor).queryByRole('button')).not.toBeInTheDocument()
    })
  })

  describe('turning two-step verification off', () => {
    it('says what is lost, asks for the password, and says it is off', async () => {
      renderPage(betterAuth(['credential'], true))
      await screen.findByRole('button', { name: 'Turn off' })

      click('Turn off')

      expect(within(form('Turn off')).getByText(/your backup codes stop working/)).toBeInTheDocument()
      confirmWith('Turn off two-step verification')
      await waitFor(() =>
        expect(section('Two-step verification')).toHaveTextContent('Done: signing in asks only for your password.')
      )
      expect(section('Two-step verification')).toHaveTextContent('Available once two-step verification is on.')
      await waitFor(() => expect(screen.getByRole('button', { name: 'Turn on' })).toHaveFocus())
    })

    it('can be cancelled', async () => {
      renderPage(betterAuth(['credential'], true))
      await screen.findByRole('button', { name: 'Turn off' })
      click('Turn off')

      click('Cancel')

      expect(screen.queryByRole('group', { name: 'Turn off' })).not.toBeInTheDocument()
      expect(section('Two-step verification')).toHaveTextContent('Signing in with your password also asks')
    })
  })

  describe('backup codes', () => {
    it('says the old ones stop working, asks for the password, then shows the new ones until saved', async () => {
      renderPage(betterAuth(['credential'], true))
      await screen.findByRole('button', { name: 'Get new codes' })

      click('Get new codes')
      expect(within(form('Get new codes')).getByText(/stop working/)).toBeInTheDocument()
      confirmWith('Get new codes')

      expect(await screen.findByRole('list', { name: 'Backup codes' })).toBeInTheDocument()
      expect(screen.getByText('Your new backup codes are ready. The old ones no longer work.')).toHaveFocus()
      expect(screen.queryByRole('button', { name: 'Cancel' })).not.toBeInTheDocument()
      click('I saved them')

      expect(screen.queryByRole('list', { name: 'Backup codes' })).not.toBeInTheDocument()
      await waitFor(() => expect(screen.getByRole('button', { name: 'Get new codes' })).toHaveFocus())
    })

    it('can be cancelled', async () => {
      renderPage(betterAuth(['credential'], true))
      await screen.findByRole('button', { name: 'Get new codes' })
      click('Get new codes')

      click('Cancel')

      expect(screen.queryByRole('group', { name: 'Get new codes' })).not.toBeInTheDocument()
    })

    it('shows the second step off when it was turned off elsewhere meanwhile', async () => {
      renderPage(
        betterAuth(['credential'], true, {
          '/two-factor/generate-backup-codes': () => Response.json({ code: 'TWO_FACTOR_NOT_ENABLED' }, { status: 400 })
        })
      )
      await screen.findByRole('button', { name: 'Get new codes' })
      click('Get new codes')

      confirmWith('Get new codes')

      await waitFor(() => expect(section('Two-step verification')).toHaveTextContent('Available once'))
      expect(screen.getByRole('button', { name: 'Turn on' })).toBeInTheDocument()
    })
  })

  describe('Google', () => {
    it('is unlinked with one press, no confirmation, and the row says it can be linked again', async () => {
      renderPage(betterAuth(['credential', 'google'], false))

      const signIn = await screen.findByRole('region', { name: 'Ways to sign in' })
      await within(signIn).findByRole('button', { name: 'Unlink Google' })
      expect(signIn).toHaveTextContent('Linked')
      expect(signIn).toHaveTextContent('You can unlink it and link it again at any time.')
      click('Unlink Google')

      await waitFor(() => expect(signIn).toHaveTextContent('Google was unlinked. You can link it again at any time.'))
      expect(signIn).toHaveTextContent('Not linked')
      await waitFor(() => expect(within(signIn).getByRole('button', { name: 'Link Google' })).toHaveFocus())
    })

    it('asks to sign in again when the session is too old to unlink', async () => {
      renderPage(
        betterAuth(['credential', 'google'], false, {
          '/unlink-account': () => Response.json({ code: 'SESSION_NOT_FRESH' }, { status: 403 })
        })
      )
      fireEvent.click(await screen.findByRole('button', { name: 'Unlink Google' }))

      const alert = await screen.findByRole('alert')

      expect(alert).toHaveTextContent('sign in again before you unlink Google')
      expect(within(alert).getByRole('link', { name: 'Sign in again' })).toBeInTheDocument()
    })

    it('is linked from the row, and a failure to start says so', async () => {
      renderPage(betterAuth(['credential'], false, { '/link-social': () => Response.json({}, { status: 429 }) }))

      fireEvent.click(await screen.findByRole('button', { name: 'Link Google' }))

      expect(await screen.findByRole('alert')).toHaveTextContent('Too many attempts.')
      expect(section('Ways to sign in')).toHaveTextContent('Not linked')
    })

    it('has no unlink for an account that signs in with Google alone', async () => {
      renderPage(betterAuth(['google'], false))

      const signIn = await screen.findByRole('region', { name: 'Ways to sign in' })
      await waitFor(() => expect(signIn).toHaveTextContent('It is how you sign in'))
      expect(within(signIn).queryByRole('button', { name: 'Unlink Google' })).not.toBeInTheDocument()
    })

    it('says why linking Google failed, in the row', async () => {
      renderPage(betterAuth(['credential'], false), '/settings/security?error=account_already_linked_to_different_user')

      expect(await screen.findByRole('alert')).toHaveTextContent(
        'That Google account already signs in to another account here.'
      )
    })

    it('is not offered when the API has no Google and it is not linked', async () => {
      renderPage(betterAuth(['credential'], false, {}, false))
      await screen.findByRole('button', { name: 'Change password' })

      expect(screen.queryByText('Google')).not.toBeInTheDocument()
    })
  })

  it('sends the user to sign in when the session has ended, to come back here', async () => {
    const history = renderPage(async () => Response.json({ code: 'UNAUTHORIZED' }, { status: 401 }))

    await waitFor(() => expect(history.get()).toBe('/login?next=%2Fsettings%2Fsecurity'))
  })

  it('says when the account cannot be read, and tries again on request', async () => {
    const answers = betterAuth(['credential'], false)
    const fetch = vi.fn<Fetch>().mockRejectedValueOnce(new TypeError('Failed to fetch')).mockImplementation(answers)
    renderPage(fetch)

    expect(await screen.findByRole('alert')).toHaveTextContent('We could not load your account security.')
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }))

    expect(await screen.findByText('You sign in with your email and a password.')).toBeInTheDocument()
  })
})
