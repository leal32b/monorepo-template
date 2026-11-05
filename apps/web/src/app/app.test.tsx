import { fireEvent, render, screen, waitFor, within } from '@solidjs/testing-library'
import { createApiClient, createAuthClient, createRequests } from '#shared/api'
import { App } from './app'

describe('App', () => {
  afterEach(() => window.history.replaceState(null, '', '/'))

  it('opens the signed-in user’s organization at the root, with its home in the app frame', async () => {
    const health = { status: 'ok', service: 'api', timestamp: '2026-10-17T12:00:00.000Z', database: 'up' }
    const user = { id: 'u1', email: 'ada@example.com', name: 'Ada Lovelace', twoFactorEnabled: false, locale: 'en' }
    const membership = { roles: ['owner'], permissions: { organization: ['update', 'delete'] } }
    const client = createApiClient({
      fetch: async (path) => Response.json(path === '/api/organizations/org-1/me' ? membership : health)
    })
    const auth = createAuthClient({
      fetch: async (input) =>
        String(input).includes('/organization/list')
          ? Response.json([{ id: 'org-1', name: 'Acme', slug: 'acme' }])
          : Response.json({ session: { id: 's1' }, user })
    })

    render(() => <App client={client} auth={auth} locale="en" />)

    expect(await screen.findByRole('heading', { level: 1, name: 'Home' })).toBeInTheDocument()
    await waitFor(() => expect(window.location.pathname).toBe('/acme'))
    expect(screen.getByRole('button', { name: /Ada Lovelace/ })).toBeInTheDocument()
    expect(await screen.findByRole('button', { name: 'Service status: All systems normal' })).toBeInTheDocument()
  })

  it('sends a signed-in user without an organization to name one', async () => {
    const user = { id: 'u1', email: 'ada@example.com', name: 'Ada Lovelace', twoFactorEnabled: false, locale: 'en' }
    const client = createApiClient({ fetch: async () => Response.json(null) })
    const auth = createAuthClient({
      fetch: async (input) =>
        String(input).includes('/organization/list')
          ? Response.json([])
          : Response.json({ session: { id: 's1' }, user })
    })

    render(() => <App client={client} auth={auth} locale="en" />)

    expect(await screen.findByRole('heading', { level: 1, name: 'Name your organization' })).toBeInTheDocument()
    await waitFor(() => expect(window.location.pathname).toBe('/onboarding'))
  })

  it('opens the invitation of an email’s link, for the signed-in user', async () => {
    const user = { id: 'u1', email: 'ada@example.com', name: 'Ada Lovelace', twoFactorEnabled: false, locale: 'en' }
    const invitation = {
      id: 'inv-1',
      organizationName: 'Acme',
      organizationSlug: 'acme',
      inviterName: 'Grace Hopper',
      status: 'pending',
      expiresAt: '2026-11-11T12:00:00.000Z',
      member: false
    }
    const client = createApiClient({
      fetch: async (path) => Response.json(path === '/api/invitations/inv-1' ? invitation : null)
    })
    const auth = createAuthClient({
      fetch: async (input) =>
        String(input).includes('/organization/list')
          ? Response.json([])
          : Response.json({ session: { id: 's1' }, user })
    })
    window.history.replaceState(null, '', '/invitations/inv-1')

    render(() => <App client={client} auth={auth} locale="en" />)

    expect(await screen.findByRole('heading', { level: 1, name: 'Invitation to Acme' })).toBeInTheDocument()
  })

  it('sends a visitor who opens an invitation to sign in, to come back to it', async () => {
    const client = createApiClient({ fetch: async () => Response.json({ google: false }) })
    const auth = createAuthClient({ fetch: async () => Response.json(null) })
    window.history.replaceState(null, '', '/invitations/inv-1')

    render(() => <App client={client} auth={auth} locale="en" />)

    expect(await screen.findByRole('heading', { level: 1, name: 'Sign in' })).toBeInTheDocument()
    await waitFor(() => expect(window.location.search).toBe('?next=%2Finvitations%2Finv-1'))
    expect(screen.getByRole('link', { name: 'Create an account' })).toHaveAttribute(
      'href',
      '/signup?next=%2Finvitations%2Finv-1'
    )
  })

  it('sends a visitor who opens an organization’s link to sign in, to come back to it', async () => {
    const client = createApiClient({ fetch: async () => Response.json({ google: false }) })
    const auth = createAuthClient({ fetch: async () => Response.json(null) })
    window.history.replaceState(null, '', '/acme')

    render(() => <App client={client} auth={auth} locale="en" />)

    expect(await screen.findByRole('heading', { level: 1, name: 'Sign in' })).toBeInTheDocument()
    await waitFor(() => expect(window.location.search).toBe('?next=%2Facme'))
  })

  it('sends a visitor without a session from the home page to sign in, without asking the API who they are', async () => {
    const fetch = vi.fn(async () => Response.json({ google: false }))
    const client = createApiClient({ fetch })
    const auth = createAuthClient({ fetch: async () => Response.json(null) })

    render(() => <App client={client} auth={auth} locale="en" />)

    expect(await screen.findByRole('heading', { level: 1, name: 'Sign in' })).toBeInTheDocument()
    await waitFor(() => expect(window.location.search).toBe('?next=%2F'))
    expect(fetch).not.toHaveBeenCalledWith('/api/me', expect.anything())
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
    await waitFor(() => expect(window.location.pathname).toBe('/settings/profile'))
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
    await waitFor(() => expect(window.location.search).toBe('?next=%2Fsettings%2Fsecurity'))
  })

  describe('the settings of the organization', () => {
    const user = { id: 'u1', email: 'ada@example.com', name: 'Ada Lovelace', twoFactorEnabled: false, locale: 'en' }
    const owner = { roles: ['owner'], permissions: { organization: ['update', 'delete'] } }

    /** Ada in Acme, which she owns; every answer of the organization plugin is `true`. */
    const inAcme = () => {
      const client = createApiClient({
        fetch: async (path) =>
          Response.json(
            path === '/api/organizations/org-1/me'
              ? owner
              : { status: 'ok', service: 'api', timestamp: '2026-10-17T12:00:00.000Z', database: 'up' }
          )
      })
      const auth = createAuthClient({
        fetch: async (input) => {
          const url = String(input)
          if (url.includes('/organization/update')) return Response.json({ id: 'org-1' })
          if (url.includes('/organization/list-members')) {
            return Response.json({
              members: [
                {
                  id: 'm1',
                  userId: 'u1',
                  role: 'owner',
                  createdAt: '2026-11-04T12:00:00.000Z',
                  user: { name: 'Ada Lovelace', email: 'ada@example.com' }
                }
              ],
              total: 1
            })
          }
          if (url.includes('/organization/list-roles')) return Response.json([])
          if (url.includes('/organization/list')) return Response.json([{ id: 'org-1', name: 'Acme', slug: 'acme' }])
          return Response.json({ session: { id: 's1' }, user })
        }
      })
      return { client, auth }
    }

    it('opens /:orgSlug/settings on General', async () => {
      window.history.replaceState(null, '', '/acme/settings')

      render(() => <App {...inAcme()} locale="en" />)

      expect(await screen.findByRole('heading', { level: 1, name: 'General' })).toBeInTheDocument()
      await waitFor(() => expect(window.location.pathname).toBe('/acme/settings/general'))
    })

    it('serves the members of the organization under its settings', async () => {
      window.history.replaceState(null, '', '/acme/settings/members')

      render(() => <App {...inAcme()} locale="en" />)

      expect(await screen.findByRole('heading', { level: 1, name: 'Members' })).toBeInTheDocument()
      expect(await screen.findByText('ada@example.com')).toBeInTheDocument()
    })

    it('serves the roles of the organization under its settings', async () => {
      window.history.replaceState(null, '', '/acme/settings/roles')

      render(() => <App {...inAcme()} locale="en" />)

      expect(await screen.findByRole('heading', { level: 1, name: 'Roles' })).toBeInTheDocument()
      expect(await screen.findByRole('region', { name: 'Built-in roles' })).toBeInTheDocument()
    })

    it('keeps the page on screen after the address changes, now at the new address', async () => {
      window.history.replaceState(null, '', '/acme/settings/general')
      render(() => <App {...inAcme()} locale="en" />)
      fireEvent.click(await screen.findByRole('button', { name: 'Change address' }))
      fireEvent.input(await screen.findByRole('textbox', { name: 'Address' }), { target: { value: 'acme-inc' } })

      fireEvent.click(screen.getByRole('button', { name: 'Save address' }))

      expect(await screen.findByText('Address saved')).toBeInTheDocument()
      await waitFor(() => expect(window.location.pathname).toBe('/acme-inc/settings/general'))
      expect(screen.getByRole('heading', { level: 1, name: 'General' })).toBeInTheDocument()
      expect(screen.queryByRole('heading', { name: 'Page not found' })).not.toBeInTheDocument()
      expect(screen.getByText('/acme-inc')).toBeInTheDocument()
    })

    it('leaves for onboarding after deleting the only organization', async () => {
      window.history.replaceState(null, '', '/acme/settings/general')
      let deleted = false
      const { client } = inAcme()
      const auth = createAuthClient({
        fetch: async (input) => {
          const url = String(input)
          if (url.includes('/organization/delete')) {
            deleted = true
            return Response.json({ id: 'org-1' })
          }
          if (url.includes('/organization/list')) {
            return Response.json(deleted ? [] : [{ id: 'org-1', name: 'Acme', slug: 'acme' }])
          }
          return Response.json({ session: { id: 's1' }, user })
        }
      })
      render(() => <App client={client} auth={auth} locale="en" />)
      fireEvent.click(await screen.findByRole('button', { name: 'Delete organization' }))
      fireEvent.input(await screen.findByRole('textbox', { name: 'Type the organization name to confirm' }), {
        target: { value: 'Acme' }
      })

      fireEvent.click(
        within(screen.getByRole('group', { name: 'Delete organization' })).getByRole('button', {
          name: 'Delete organization'
        })
      )

      expect(await screen.findByRole('heading', { level: 1, name: 'Name your organization' })).toBeInTheDocument()
      await waitFor(() => expect(window.location.pathname).toBe('/onboarding'))
    })

    it('is offered by the account settings too, for the organization that / would open', async () => {
      window.history.replaceState(null, '', '/settings/profile')

      render(() => <App {...inAcme()} locale="en" />)

      const menu = within(await screen.findByRole('navigation', { name: 'Settings' }))
      const link = await menu.findByRole('link', { name: 'General' })
      expect(link).toHaveAttribute('href', '/acme/settings/general')
    })

    it('lets the frame stand aside for "not found" after the screens before it left, even through transitions', async () => {
      window.history.replaceState(null, '', '/settings/profile')
      render(() => <App {...inAcme()} locale="en" />)
      const go = async (path: string, title: string) => {
        window.history.pushState(null, '', path)
        window.dispatchEvent(new PopStateEvent('popstate'))
        expect(await screen.findByRole('heading', { level: 1, name: title })).toBeInTheDocument()
      }
      await screen.findByRole('heading', { level: 1, name: 'Profile' })

      await go('/acme', 'Home')
      await go('/settings/profile', 'Profile')
      await go('/nowhere', 'Page not found')

      await waitFor(() => expect(screen.queryByRole('banner')).not.toBeInTheDocument())
      expect(document.querySelector('aside')).toBeNull()
    })

    it('keeps the frame from the account settings to the organization’s, reading the service status once', async () => {
      window.history.replaceState(null, '', '/settings/profile')
      const { client, auth } = inAcme()
      const health = vi.spyOn(client, 'get')

      render(() => <App client={client} auth={auth} locale="en" />)

      const menu = within(await screen.findByRole('navigation', { name: 'Settings' }))
      const frame = (await menu.findByRole('link', { name: 'General' })).closest('aside')
      fireEvent.click(await menu.findByRole('link', { name: 'General' }))

      expect(await screen.findByRole('heading', { level: 1, name: 'General' })).toBeInTheDocument()
      expect(screen.getByRole('navigation', { name: 'Settings' }).closest('aside')).toBe(frame)
      expect(health.mock.calls.filter(([path]) => path === '/api/health')).toHaveLength(1)
    })
  })

  it('answers an address that does not exist with a page that says so', () => {
    const client = createApiClient({ fetch: async () => Response.json(null) })
    const auth = createAuthClient({ fetch: async () => Response.json(null) })
    window.history.replaceState(null, '', '/nowhere/at/all')

    render(() => <App client={client} auth={auth} locale="en" />)

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Page not found')
  })

  it('shows the progress bar while a request the clients make takes long, and hides it once answered', async () => {
    const requests = createRequests()
    let answer: (response: Response) => void = () => undefined
    const client = createApiClient({ fetch: requests.track(async () => Response.json(null)) })
    const auth = createAuthClient({
      fetch: requests.track(() => new Promise((resolve) => (answer = resolve)))
    })

    render(() => <App client={client} auth={auth} requests={requests} locale="en" />)

    expect(await screen.findByTestId('progress-bar')).toBeInTheDocument()
    answer(Response.json(null))
    await waitFor(() => expect(screen.queryByTestId('progress-bar')).not.toBeInTheDocument())
  })
})
