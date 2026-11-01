import { render, screen } from '@solidjs/testing-library'
import { createApiClient, createAuthClient } from '#shared/api'
import { App } from './app'

describe('App', () => {
  afterEach(() => window.history.replaceState(null, '', '/'))

  it('serves the home page at the root route to whoever is signed in, with the given clients', async () => {
    const health = { status: 'ok', service: 'api', timestamp: '2026-10-17T12:00:00.000Z', database: 'up' }
    const me = { id: 'u1', email: 'ada@example.com', name: 'Ada Lovelace' }
    const client = createApiClient({ fetch: async (path) => Response.json(path === '/api/me' ? me : health) })
    const auth = createAuthClient({ fetch: async () => Response.json(null) })

    render(() => <App client={client} auth={auth} locale="en" />)

    expect(await screen.findByRole('button', { name: /Ada Lovelace/ })).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Home')
    expect(await screen.findByRole('button', { name: 'Service status: All systems normal' })).toBeInTheDocument()
  })

  it('sends a visitor without a session from the home page to sign in', async () => {
    const client = createApiClient({ fetch: async () => Response.json({ code: 'unauthenticated' }, { status: 401 }) })
    const auth = createAuthClient({ fetch: async () => Response.json(null) })

    render(() => <App client={client} auth={auth} locale="en" />)

    expect(await screen.findByRole('heading', { level: 1, name: 'Sign in' })).toBeInTheDocument()
    expect(window.location.search).toBe('?next=%2F')
  })

  it('serves the sign-up page at /signup', () => {
    const client = createApiClient({ fetch: async () => Response.json(null) })
    const auth = createAuthClient({ fetch: async () => Response.json(null) })
    window.history.replaceState(null, '', '/signup')

    render(() => <App client={client} auth={auth} locale="en" />)

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Create your account')
  })

  it('shows Google at the first paint when the app already knows the API has it, without asking again', () => {
    const fetch = vi.fn(async () => Response.json(null))
    const client = createApiClient({ fetch })
    const auth = createAuthClient({ fetch: async () => Response.json(null) })
    window.history.replaceState(null, '', '/login')

    render(() => <App client={client} auth={auth} locale="en" identity={{ google: true }} />)

    expect(screen.getByRole('button', { name: 'Continue with Google' }).closest('.invisible')).toBeNull()
    expect(fetch).not.toHaveBeenCalledWith('/api/identity/options', expect.anything())
  })

  it('serves the sign-in page at /login', () => {
    const client = createApiClient({ fetch: async () => Response.json(null) })
    const auth = createAuthClient({ fetch: async () => Response.json(null) })
    window.history.replaceState(null, '', '/login')

    render(() => <App client={client} auth={auth} locale="en" />)

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Sign in')
  })

  it('serves the second step of the sign-in at /login/two-factor', () => {
    const client = createApiClient({ fetch: async () => Response.json(null) })
    const auth = createAuthClient({ fetch: async () => Response.json(null) })
    window.history.replaceState(null, '', '/login/two-factor')

    render(() => <App client={client} auth={auth} locale="en" />)

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Two-step verification')
  })

  it('serves the request for a new password at /forgot-password', () => {
    const client = createApiClient({ fetch: async () => Response.json(null) })
    const auth = createAuthClient({ fetch: async () => Response.json(null) })
    window.history.replaceState(null, '', '/forgot-password')

    render(() => <App client={client} auth={auth} locale="en" />)

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Reset your password')
  })

  it('serves the choice of a new password at /reset-password', () => {
    const client = createApiClient({ fetch: async () => Response.json(null) })
    const auth = createAuthClient({ fetch: async () => Response.json(null) })
    window.history.replaceState(null, '', '/reset-password?token=t0k3n')

    render(() => <App client={client} auth={auth} locale="en" />)

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Choose a new password')
  })

  /** The API and Better Auth for Ada, signed in with a password and no second step. */
  const signedIn = () => {
    const me = { id: 'u1', email: 'ada@example.com', name: 'Ada Lovelace' }
    const client = createApiClient({ fetch: async () => Response.json(me) })
    const auth = createAuthClient({
      fetch: async (input) =>
        String(input).includes('/list-accounts')
          ? Response.json([{ id: 'a1', providerId: 'credential' }])
          : Response.json({ session: { id: 's1' }, user: { ...me, twoFactorEnabled: false } })
    })
    return { client, auth }
  }

  it.each([
    ['/settings/profile', 'Profile'],
    ['/settings/security', 'Security'],
    ['/settings/preferences', 'Preferences']
  ])('serves %s, behind the sign-in', async (path, title) => {
    window.history.replaceState(null, '', path)

    render(() => <App {...signedIn()} locale="en" />)

    expect(await screen.findByRole('heading', { level: 1, name: title })).toBeInTheDocument()
  })

  it('opens the settings on the profile', async () => {
    window.history.replaceState(null, '', '/settings')

    render(() => <App {...signedIn()} locale="en" />)

    expect(await screen.findByRole('heading', { level: 1, name: 'Profile' })).toBeInTheDocument()
    expect(window.location.pathname).toBe('/settings/profile')
  })

  it('sends /account, from older emails, bookmarks and the Google link, to the security, keeping its error', async () => {
    window.history.replaceState(null, '', '/account?error=account_already_linked_to_different_user')

    render(() => <App {...signedIn()} locale="en" />)

    expect(await screen.findByRole('heading', { level: 1, name: 'Security' })).toBeInTheDocument()
    expect(window.location.pathname + window.location.search).toBe(
      '/settings/security?error=account_already_linked_to_different_user'
    )
  })

  it('sends a visitor without a session from /account to sign in, to come back to the security', async () => {
    const client = createApiClient({ fetch: async () => Response.json({ code: 'unauthenticated' }, { status: 401 }) })
    const auth = createAuthClient({ fetch: async () => Response.json(null) })
    window.history.replaceState(null, '', '/account')

    render(() => <App client={client} auth={auth} locale="en" />)

    expect(await screen.findByRole('heading', { level: 1, name: 'Sign in' })).toBeInTheDocument()
    expect(window.location.search).toBe('?next=%2Fsettings%2Fsecurity')
  })

  it('answers an address that does not exist with a page that says so', () => {
    const client = createApiClient({ fetch: async () => Response.json(null) })
    const auth = createAuthClient({ fetch: async () => Response.json(null) })
    window.history.replaceState(null, '', '/nowhere')

    render(() => <App client={client} auth={auth} locale="en" />)

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Page not found')
  })
})
