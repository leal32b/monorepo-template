import { builtInRoles } from '@repo/contracts'
import { fireEvent, render, screen, waitFor, within } from '@solidjs/testing-library'
import { rememberSession } from '#entities/sessions'
import { createApiClient, createAuthClient, createRequests } from '#shared/api'
import { App } from './app'

/** Follows a link the way the router takes one, as a link elsewhere on the page or the palette does. */
const follow = (href: string) => {
  const link = Object.assign(document.createElement('a'), { href })
  document.body.append(link)
  link.click()
  link.remove()
}

describe('App', () => {
  afterEach(() => {
    window.history.replaceState(null, '', '/')
    window.localStorage.clear()
  })

  it('opens the signed-in user’s organization at the root, with its home in the app frame', async () => {
    const user = { id: 'u1', email: 'ada@example.com', name: 'Ada Lovelace', twoFactorEnabled: false, locale: 'en' }
    const membership = { roles: ['owner'], permissions: { organization: ['update', 'delete'] } }
    const client = createApiClient({
      fetch: async (path) => Response.json(path === '/api/organizations/org-1/me' ? membership : null)
    })
    const auth = createAuthClient({
      fetch: async (input) =>
        String(input).includes('/organization/list')
          ? Response.json([{ id: 'org-1', name: 'Acme', slug: 'acme', timeZone: 'UTC', currency: 'USD' }])
          : Response.json({ session: { id: 's1' }, user })
    })

    render(() => <App client={client} auth={auth} locale="en" />)

    expect(await screen.findByRole('heading', { level: 1, name: 'Home' })).toBeInTheDocument()
    await waitFor(() => expect(window.location.pathname).toBe('/acme'))
    expect(screen.getByRole('button', { name: /Ada Lovelace/ })).toBeInTheDocument()
  })

  it('asks for the session and the organizations together, before either answers, where a session was seen (ADR 0038, ADR 0042)', async () => {
    rememberSession()
    const asked: string[] = []
    const auth = createAuthClient({
      fetch: (input) => {
        asked.push(new URL(String(input), 'http://localhost').pathname)
        return new Promise<Response>(() => {})
      }
    })
    const client = createApiClient({ fetch: () => new Promise<Response>(() => {}) })
    window.history.replaceState(null, '', '/acme')

    render(() => <App client={client} auth={auth} locale="en" />)

    await waitFor(() => expect(asked).toContain('/api/auth/get-session'))
    await waitFor(() => expect(asked).toContain('/api/auth/organization/list'))
  })

  it('asks a visitor for nothing but the session, so the console shows no failed call (ADR 0042)', async () => {
    const asked: string[] = []
    const client = createApiClient({
      fetch: async (path) => {
        asked.push(path)
        return Response.json(null)
      }
    })
    const auth = createAuthClient({
      fetch: async (input) => {
        asked.push(new URL(String(input), 'http://localhost').pathname)
        return Response.json(null)
      }
    })
    window.history.replaceState(null, '', '/acme/settings/members')

    render(() => <App client={client} auth={auth} locale="en" />)

    await waitFor(() => expect(window.location.pathname).toBe('/login'))
    expect(asked).toContain('/api/auth/get-session')
    expect(asked.filter((path) => path.includes('/organization') || path.includes('/organizations/'))).toEqual([])
  })

  it('asks for the organizations once the session answers, on a device that has not seen one (ADR 0042)', async () => {
    const user = { id: 'u1', email: 'ada@example.com', name: 'Ada Lovelace', twoFactorEnabled: false, locale: 'en' }
    const asked: string[] = []
    const auth = createAuthClient({
      fetch: async (input) => {
        const path = new URL(String(input), 'http://localhost').pathname
        asked.push(path)
        return path.endsWith('/organization/list')
          ? new Promise<Response>(() => {})
          : Response.json({ session: { id: 's1' }, user })
      }
    })
    const client = createApiClient({ fetch: () => new Promise<Response>(() => {}) })
    window.history.replaceState(null, '', '/acme')

    render(() => <App client={client} auth={auth} locale="en" />)

    await waitFor(() => expect(asked).toEqual(['/api/auth/get-session', '/api/auth/organization/list']))
  })

  it('asks for the members screen’s lists beside the membership, on a cold load (ADR 0038)', async () => {
    rememberSession()
    const user = { id: 'u1', email: 'ada@example.com', name: 'Ada Lovelace', twoFactorEnabled: false, locale: 'en' }
    const asked: string[] = []
    const client = createApiClient({
      fetch: (path) => {
        asked.push(path)
        return path.endsWith('/me') ? new Promise<Response>(() => {}) : Promise.resolve(Response.json(null))
      }
    })
    const auth = createAuthClient({
      fetch: async (input) => {
        const url = String(input)
        asked.push(new URL(url, 'http://localhost').pathname)
        if (url.includes('/organization/list-')) return new Promise<Response>(() => {})
        if (url.includes('/organization/list'))
          return Response.json([{ id: 'org-1', name: 'Acme', slug: 'acme', timeZone: 'UTC', currency: 'USD' }])
        return Response.json({ session: { id: 's1' }, user })
      }
    })
    window.history.replaceState(null, '', '/acme/settings/members')

    render(() => <App client={client} auth={auth} locale="en" />)

    await waitFor(() =>
      expect(asked).toEqual(
        expect.arrayContaining([
          '/api/organizations/org-1/me',
          '/api/auth/organization/list-members',
          '/api/auth/organization/list-roles',
          '/api/auth/organization/list-invitations'
        ])
      )
    )
  })

  it('asks for the ways to sign in and Google beside the session, on a cold load of the security screen (ADR 0038)', async () => {
    rememberSession()
    const asked: string[] = []
    const never = (input: RequestInfo | URL) => {
      asked.push(new URL(String(input), 'http://localhost').pathname)
      return new Promise<Response>(() => {})
    }
    window.history.replaceState(null, '', '/settings/security')

    render(() => (
      <App client={createApiClient({ fetch: never })} auth={createAuthClient({ fetch: never })} locale="en" />
    ))

    await waitFor(() =>
      expect(asked).toEqual(
        expect.arrayContaining(['/api/auth/get-session', '/api/auth/list-accounts', '/api/identity/options'])
      )
    )
  })

  it.each([
    ['/onboarding', '/api/auth/organization/list-user-invitations'],
    ['/invitations/inv-1', '/api/invitations/inv-1'],
    ['/settings/profile', '/api/me/account-deletion']
  ])('asks for what %s shows beside the session, on a cold load (ADR 0038)', async (path, read) => {
    rememberSession()
    const asked: string[] = []
    const never = (input: RequestInfo | URL) => {
      asked.push(new URL(String(input), 'http://localhost').pathname)
      return new Promise<Response>(() => {})
    }
    const auth = createAuthClient({ fetch: never })
    const client = createApiClient({ fetch: never })
    window.history.replaceState(null, '', path)

    render(() => <App client={client} auth={auth} locale="en" />)

    await waitFor(() => expect(asked).toEqual(expect.arrayContaining(['/api/auth/get-session', read])))
  })

  it('sends a signed-in user without an organization to name one, on an entry screen without the frame', async () => {
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
    expect(document.querySelector('aside')).toBeNull()
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
    ['/settings/preferences', 'Preferences'],
    ['/settings/delete-account?token=t', 'Delete account']
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
              : { status: 'ok', service: 'api', release: 'dev', timestamp: '2026-10-17T12:00:00.000Z', database: 'up' }
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
          if (url.includes('/organization/list'))
            return Response.json([{ id: 'org-1', name: 'Acme', slug: 'acme', timeZone: 'UTC', currency: 'USD' }])
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

    it('serves the customers of the organization, its first page read as the address opens (ADR 0044)', async () => {
      rememberSession()
      window.history.replaceState(null, '', '/acme/customers')
      const asked: string[] = []
      const client = createApiClient({
        fetch: async (path) => {
          asked.push(path)
          if (path === '/api/organizations/org-1/me') {
            return Response.json({ roles: ['owner'], permissions: { customer: ['read', 'create'] } })
          }
          return Response.json({
            items: [
              {
                id: 'c1',
                name: 'Grace Hopper',
                email: null,
                phone: null,
                company: null,
                notes: null,
                createdAt: '2026-11-07T10:00:00.000Z',
                updatedAt: '2026-11-07T10:00:00.000Z',
                archivedAt: null,
                version: 1
              }
            ],
            total: 1,
            page: 1,
            pageSize: 25
          })
        }
      })

      render(() => <App client={client} auth={inAcme().auth} locale="en" />)

      expect(await screen.findByRole('heading', { level: 1, name: 'Customers' })).toBeInTheDocument()
      expect(await screen.findByText('Grace Hopper')).toBeInTheDocument()
      expect(asked.filter((path) => path.includes('/customers'))).toEqual([
        '/api/organizations/org-1/customers?status=active&page=1'
      ])
    })

    it('asks for no customers at an address that names none of the user’s organizations', async () => {
      rememberSession()
      window.history.replaceState(null, '', '/globex/customers')
      const asked: string[] = []
      const { auth } = inAcme()
      const client = createApiClient({
        fetch: async (path) => {
          asked.push(path)
          return Response.json(null)
        }
      })

      render(() => <App client={client} auth={auth} locale="en" />)

      expect(await screen.findByRole('heading', { name: 'Page not found' })).toBeInTheDocument()
      expect(asked.filter((path) => path.includes('/customers'))).toEqual([])
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
            return Response.json(
              deleted ? [] : [{ id: 'org-1', name: 'Acme', slug: 'acme', timeZone: 'UTC', currency: 'USD' }]
            )
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

    it('opens the members of the organization from the account settings, right after the start', async () => {
      window.history.replaceState(null, '', '/settings/profile')
      render(() => <App {...inAcme()} locale="en" />)
      await screen.findByRole('heading', { level: 1, name: 'Profile' })

      follow('/acme/settings/members')

      expect(await screen.findByRole('heading', { level: 1, name: 'Members' })).toBeInTheDocument()
      expect(await screen.findByText('ada@example.com')).toBeInTheDocument()
      expect(screen.queryByRole('heading', { name: 'Page not found' })).not.toBeInTheDocument()
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

    it('keeps the frame from the account settings to the organization’s', async () => {
      window.history.replaceState(null, '', '/settings/profile')
      const { client, auth } = inAcme()
      render(() => <App client={client} auth={auth} locale="en" />)

      const menu = within(await screen.findByRole('navigation', { name: 'Settings' }))
      const frame = (await menu.findByRole('link', { name: 'General' })).closest('aside')
      fireEvent.click(await menu.findByRole('link', { name: 'General' }))

      expect(await screen.findByRole('heading', { level: 1, name: 'General' })).toBeInTheDocument()
      expect(screen.getByRole('navigation', { name: 'Settings' }).closest('aside')).toBe(frame)
    })

    it('asks nothing for a screen whose link is only hovered: its reads start with the click (ADR 0040)', async () => {
      window.history.replaceState(null, '', '/acme/settings/general')
      const { client } = inAcme()
      const asked: string[] = []
      const auth = createAuthClient({
        fetch: async (input) => {
          const url = String(input)
          asked.push(new URL(url, 'http://localhost').pathname)
          if (url.includes('/organization/list-members')) return Response.json({ members: [], total: 0 })
          if (url.includes('/organization/list-')) return Response.json([])
          if (url.includes('/organization/list'))
            return Response.json([{ id: 'org-1', name: 'Acme', slug: 'acme', timeZone: 'UTC', currency: 'USD' }])
          return Response.json({ session: { id: 's1' }, user })
        }
      })
      render(() => <App client={client} auth={auth} locale="en" />)
      await screen.findByRole('heading', { level: 1, name: 'General' })
      const members = within(screen.getByRole('navigation', { name: 'Settings' })).getByRole('link', {
        name: 'Members'
      })

      // The router takes a link the pointer rests on for 20 ms as a sign the user may follow it.
      fireEvent.mouseMove(members)
      await new Promise((resolve) => setTimeout(resolve, 100))

      expect(asked).not.toContain('/api/auth/organization/list-members')
      fireEvent.click(members)
      await waitFor(() => expect(asked).toContain('/api/auth/organization/list-members'))
    })
  })

  describe('switching organizations', () => {
    const user = { id: 'u1', email: 'ada@example.com', name: 'Ada Lovelace', twoFactorEnabled: false, locale: 'en' }
    /** Every answer a moment away, as over a network: the router's transition then waits on it. */
    const later = (body: unknown) =>
      new Promise<Response>((resolve) => setTimeout(() => resolve(Response.json(body)), 100))

    /** Ada owns Acme and Globex, so the home offers her the way to invite people. */
    const inTwo = () => {
      const client = createApiClient({
        fetch: (path) => later(path.endsWith('/me') ? { roles: ['owner'], permissions: builtInRoles.owner } : null)
      })
      const auth = createAuthClient({
        fetch: (input) => {
          const url = String(input)
          if (url.includes('/organization/list-members')) return later({ members: [], total: 0 })
          if (url.includes('/organization/list-roles') || url.includes('/organization/list-invitations')) {
            return later([])
          }
          if (url.includes('/organization/list')) {
            return later([
              { id: 'org-1', name: 'Acme', slug: 'acme', timeZone: 'UTC', currency: 'USD' },
              { id: 'org-2', name: 'Globex', slug: 'globex', timeZone: 'UTC', currency: 'USD' }
            ])
          }
          return later({ session: { id: 's1' }, user })
        }
      })
      return { client, auth }
    }

    it('draws the other organization in the same frame, then the next screen asked for (W13)', async () => {
      window.history.replaceState(null, '', '/acme')
      render(() => <App {...inTwo()} locale="en" />)
      await screen.findByRole('heading', { level: 1, name: 'Home' }, { timeout: 2000 })
      const frame = document.querySelector('aside') as HTMLElement

      follow('/globex')
      expect(await within(frame).findByRole('button', { name: /Globex/ }, { timeout: 2000 })).toBeInTheDocument()
      follow('/globex/settings/roles')

      expect(await screen.findByRole('heading', { level: 1, name: 'Roles' }, { timeout: 2000 })).toBeInTheDocument()
      expect(document.querySelector('aside')).toBe(frame)
    })
  })

  describe('the frame of someone who has an organization (W08, ADR 0039)', () => {
    const user = { id: 'u1', email: 'ada@example.com', name: 'Ada Lovelace', twoFactorEnabled: false, locale: 'en' }
    const acme = { id: 'org-1', name: 'Acme', slug: 'acme', timeZone: 'UTC', currency: 'USD' as const }
    const globex = { id: 'org-2', name: 'Globex', slug: 'globex', timeZone: 'UTC', currency: 'USD' as const }
    const invitation = {
      id: 'inv-1',
      organizationName: 'Globex',
      organizationSlug: 'globex',
      inviterName: 'Grace Hopper',
      status: 'pending',
      expiresAt: '2026-11-11T12:00:00.000Z',
      member: false
    }

    /** Ada, owner of `organizations`, invited to Globex, which she joins by accepting; `deleted` names the ones gone since. */
    const signedIn = (organizations = [acme], deleted = new Set<string>()) => {
      let joined = false
      const client = createApiClient({
        fetch: async (path) => {
          if (path.endsWith('/me')) return Response.json({ roles: ['owner'], permissions: builtInRoles.owner })
          if (path === '/api/invitations/inv-1') return Response.json(invitation)
          return Response.json(null)
        }
      })
      const auth = createAuthClient({
        fetch: async (input, init) => {
          const url = String(input)
          if (url.includes('/organization/delete')) {
            deleted.add(JSON.parse(String(init?.body)).organizationId)
            return Response.json({ id: 'org-1' })
          }
          if (url.includes('/organization/accept-invitation')) {
            joined = true
            return Response.json({ member: { id: 'm2' } })
          }
          if (url.includes('/organization/list-members')) return Response.json({ members: [], total: 0 })
          if (url.includes('/organization/list-')) return Response.json([])
          if (url.includes('/organization/list')) {
            const mine = joined ? [...organizations, globex] : organizations
            return Response.json(mine.filter((organization) => !deleted.has(organization.id)))
          }
          return Response.json({ session: { id: 's1' }, user })
        }
      })
      return { client, auth }
    }

    it('keeps it from an organization to creating another, and back through its side menu', async () => {
      window.history.replaceState(null, '', '/acme')
      const { client, auth } = signedIn()
      render(() => <App client={client} auth={auth} locale="en" />)
      await screen.findByRole('heading', { level: 1, name: 'Home' })
      const frame = document.querySelector('aside') as HTMLElement

      follow('/onboarding')

      expect(await screen.findByRole('heading', { level: 1, name: 'Create an organization' })).toBeInTheDocument()
      expect(document.querySelector('aside')).toBe(frame)
      fireEvent.click(within(frame).getByRole('link', { name: 'Home' }))
      expect(await screen.findByRole('heading', { level: 1, name: 'Home' })).toBeInTheDocument()
      await waitFor(() => expect(window.location.pathname).toBe('/acme'))
      expect(document.querySelector('aside')).toBe(frame)
    })

    it('keeps it on an invitation', async () => {
      window.history.replaceState(null, '', '/acme')
      const { client, auth } = signedIn()
      render(() => <App client={client} auth={auth} locale="en" />)
      await screen.findByRole('heading', { level: 1, name: 'Home' })
      const frame = document.querySelector('aside') as HTMLElement

      follow('/invitations/inv-1')

      expect(await screen.findByRole('heading', { level: 1, name: 'Invitation to Globex' })).toBeInTheDocument()
      expect(document.querySelector('aside')).toBe(frame)
    })

    it('keeps it from an invitation accepted to its organization, while the list is read again', async () => {
      window.history.replaceState(null, '', '/acme')
      const { client, auth } = signedIn()
      render(() => <App client={client} auth={auth} locale="en" />)
      await screen.findByRole('heading', { level: 1, name: 'Home' })
      const frame = document.querySelector('aside') as HTMLElement
      follow('/invitations/inv-1')

      fireEvent.click(await screen.findByRole('button', { name: 'Accept invitation' }))

      await waitFor(() => expect(window.location.pathname).toBe('/globex'))
      expect(await screen.findByRole('heading', { level: 1, name: 'Home' })).toBeInTheDocument()
      expect(document.querySelector('aside')).toBe(frame)
      expect(within(frame).getByRole('button', { name: /Globex/ })).toBeInTheDocument()
    })

    it('keeps it from the account settings back to the app', async () => {
      window.history.replaceState(null, '', '/settings/profile')
      const { client, auth } = signedIn()
      render(() => <App client={client} auth={auth} locale="en" />)
      await screen.findByRole('heading', { level: 1, name: 'Profile' })
      const frame = document.querySelector('aside') as HTMLElement
      // Once the organizations are in, as the menu shows by offering the organization's settings.
      await within(frame).findByRole('link', { name: 'General' })

      fireEvent.click(within(frame).getByRole('link', { name: 'Back to app' }))

      expect(await screen.findByRole('heading', { level: 1, name: 'Home' })).toBeInTheDocument()
      await waitFor(() => expect(window.location.pathname).toBe('/acme'))
      expect(document.querySelector('aside')).toBe(frame)
    })

    it('keeps it from an organization just deleted to the next one, while the list is read again (W10)', async () => {
      window.history.replaceState(null, '', '/acme/settings/general')
      const { client, auth } = signedIn([acme, globex])
      render(() => <App client={client} auth={auth} locale="en" />)
      fireEvent.click(await screen.findByRole('button', { name: 'Delete organization' }))
      fireEvent.input(await screen.findByRole('textbox', { name: 'Type the organization name to confirm' }), {
        target: { value: 'Acme' }
      })
      const frame = document.querySelector('aside') as HTMLElement

      fireEvent.click(
        within(screen.getByRole('group', { name: 'Delete organization' })).getByRole('button', {
          name: 'Delete organization'
        })
      )

      await waitFor(() => expect(window.location.pathname).toBe('/globex'))
      expect(await screen.findByRole('heading', { level: 1, name: 'Home' })).toBeInTheDocument()
      expect(document.querySelector('aside')).toBe(frame)
      expect(within(frame).getByRole('button', { name: /Globex/ })).toBeInTheDocument()
    })
  })

  describe('a tenant’s public page (ADR 0060)', () => {
    const acme = { name: 'Acme Barbershop', slug: 'acme', timeZone: 'UTC', currency: 'USD' }

    /** Both clients, recording every path asked; the public profile answers, anything else is refused. */
    function clientsAsked() {
      const asked: string[] = []
      const client = createApiClient({
        fetch: async (path) => {
          asked.push(path)
          return path === '/api/public/organizations/acme'
            ? Response.json(acme)
            : Response.json({ code: 'unauthorized' }, { status: 401 })
        }
      })
      const auth = createAuthClient({
        fetch: async (input) => {
          asked.push(new URL(String(input), 'http://localhost').pathname)
          return Response.json(null)
        }
      })
      return { asked, client, auth }
    }

    it('serves /p/:orgSlug in its organization’s name, asking for nothing but that organization', async () => {
      const { asked, client, auth } = clientsAsked()
      window.history.replaceState(null, '', '/p/acme')

      render(() => <App client={client} auth={auth} locale="en" />)

      expect(await screen.findByRole('heading', { level: 1, name: 'Become a customer' })).toBeInTheDocument()
      expect(screen.getByText('Acme Barbershop')).toBeInTheDocument()
      expect(screen.queryByRole('link', { name: 'Monorepo Template' })).not.toBeInTheDocument()
      expect(asked).toEqual(['/api/public/organizations/acme'])
    })

    it('asks nothing of the session even on a device where one was seen (ADR 0042)', async () => {
      rememberSession()
      const { asked, client, auth } = clientsAsked()
      window.history.replaceState(null, '', '/p/acme')

      render(() => <App client={client} auth={auth} locale="en" />)

      expect(await screen.findByRole('heading', { level: 1, name: 'Become a customer' })).toBeInTheDocument()
      expect(asked).toEqual(['/api/public/organizations/acme'])
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
    // The session and the organizations are asked for together: both answer when the test says.
    const answers: Array<(response: Response) => void> = []
    const client = createApiClient({ fetch: requests.track(async () => Response.json(null)) })
    const auth = createAuthClient({
      fetch: requests.track(() => new Promise((resolve) => answers.push(resolve)))
    })

    render(() => <App client={client} auth={auth} requests={requests} locale="en" />)

    expect(await screen.findByTestId('progress-bar')).toBeInTheDocument()
    for (const answer of answers) answer(Response.json(null))
    await waitFor(() => expect(screen.queryByTestId('progress-bar')).not.toBeInTheDocument())
  })
})
