import { createMemoryHistory, MemoryRouter, Route } from '@solidjs/router'
import { fireEvent, render, screen, waitFor, within } from '@solidjs/testing-library'
import { SessionProvider } from '#entities/sessions'
import { ApiProvider, AuthProvider, createApiClient, createAuthClient } from '#shared/api'
import { I18nProvider, type Locale } from '#shared/config'
import { AppShell } from './app-shell'

type Fetch = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>

const health = { status: 'ok', service: 'api', timestamp: '2026-10-17T12:00:00.000Z', database: 'up' }

type Options = { auth?: Fetch; api?: () => Promise<Response>; locale?: Locale; path?: string }

/** An app page at `/projects` in the shell, Better Auth and the API answering through `fetch`. */
function renderShell({
  auth = async () => Response.json({ success: true }),
  api = async () => Response.json(health),
  locale = 'en',
  path = '/projects'
}: Options = {}) {
  const history = createMemoryHistory()
  history.set({ value: path })
  render(() => (
    <I18nProvider locale={locale}>
      <ApiProvider client={createApiClient({ fetch: api })}>
        <AuthProvider client={createAuthClient({ fetch: auth })}>
          <SessionProvider user={{ id: 'u1', email: 'ada@example.com', name: 'Ada Lovelace' }}>
            <MemoryRouter history={history}>
              <Route
                path="/projects"
                component={() => (
                  <AppShell title="Projects">
                    <p>The projects</p>
                  </AppShell>
                )}
              />
              <Route
                path="/"
                component={() => (
                  <AppShell title="Start">
                    <p>The start</p>
                  </AppShell>
                )}
              />
              <Route
                path="/settings/security"
                component={() => (
                  <AppShell title="Security">
                    <p>The security</p>
                  </AppShell>
                )}
              />
              <Route path="/settings/profile" component={() => <p>The profile</p>} />
              <Route path="/login" component={() => <p>The sign-in</p>} />
            </MemoryRouter>
          </SessionProvider>
        </AuthProvider>
      </ApiProvider>
    </I18nProvider>
  ))
  return history
}

/** Chooses a menu item the way a pointer does: released over it. */
const choose = (item: HTMLElement) => {
  fireEvent.pointerUp(item)
  fireEvent.click(item)
}

const openAccountMenu = () => fireEvent.keyDown(screen.getByRole('button', { name: /Ada Lovelace/ }), { key: 'Enter' })

describe('AppShell', () => {
  it('frames an app page: the side menu, the top bar with where you are, the title and the content', () => {
    renderShell()

    const main = screen.getByRole('main')
    expect(within(main).getByRole('heading', { level: 1, name: 'Projects' })).toHaveFocus()
    expect(within(main).getByText('The projects')).toBeInTheDocument()
    expect(
      within(screen.getByRole('navigation', { name: 'Main' })).getByRole('link', { name: 'Home' })
    ).toHaveAttribute('href', '/')
    const trail = within(screen.getByRole('navigation', { name: 'You are here' }))
    expect(trail.getByRole('link', { name: 'Monorepo Template' })).toHaveAttribute('href', '/')
    expect(trail.getByText('Projects')).toHaveAttribute('aria-current', 'page')
  })

  it('keeps one heading level 1 per screen', () => {
    renderShell()

    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1)
  })

  it('names the account in the side menu by who is signed in, and opens it with the keyboard', async () => {
    renderShell()

    openAccountMenu()

    const menu = await screen.findByRole('menu')
    expect(within(menu).getByText('ada@example.com')).toBeInTheDocument()
    expect(
      within(menu)
        .getAllByRole('menuitem')
        .map((item) => item.textContent)
    ).toEqual(['Settings', 'Sign out'])
  })

  it('goes to the settings from the account menu', async () => {
    const history = renderShell()
    openAccountMenu()

    choose(await screen.findByRole('menuitem', { name: 'Settings' }))

    await waitFor(() => expect(history.get()).toBe('/settings/profile'))
  })

  it('signs out from the account menu, then leaves for the sign-in', async () => {
    const auth = vi.fn<Fetch>(async () => Response.json({ success: true }))
    const history = renderShell({ auth })
    openAccountMenu()

    choose(await screen.findByRole('menuitem', { name: 'Sign out' }))

    await waitFor(() => expect(history.get()).toBe('/login'))
    expect(String(auth.mock.calls[0]?.[0])).toBe(`${window.location.origin}/api/auth/sign-out`)
  })

  it('says when signing out failed, and stays', async () => {
    const history = renderShell({ auth: async () => Response.json({ code: 'INTERNAL_SERVER_ERROR' }, { status: 500 }) })
    openAccountMenu()

    choose(await screen.findByRole('menuitem', { name: 'Sign out' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Something went wrong on our side.')
    expect(history.get()).toBe('/projects')
  })

  describe('in the settings', () => {
    it('swaps the side menu for the way back and the settings, the current one marked', () => {
      renderShell({ path: '/settings/security' })

      expect(screen.queryByRole('navigation', { name: 'Main' })).not.toBeInTheDocument()
      const settings = within(screen.getByRole('navigation', { name: 'Settings' }))
      expect(settings.getByRole('link', { name: 'Back to app' })).toHaveAttribute('href', '/')
      const account = within(settings.getByRole('list', { name: 'Your account' }))
      expect(account.getAllByRole('link').map((link) => [link.textContent, link.getAttribute('href')])).toEqual([
        ['Profile', '/settings/profile'],
        ['Security', '/settings/security'],
        ['Preferences', '/settings/preferences']
      ])
      expect(account.getByRole('link', { name: 'Security' })).toHaveAttribute('aria-current', 'page')
    })

    it('puts the settings in the breadcrumb, between the app and the screen', () => {
      renderShell({ path: '/settings/security' })

      const trail = within(screen.getByRole('navigation', { name: 'You are here' }))
      expect(trail.getAllByRole('listitem').map((crumb) => crumb.textContent)).toEqual([
        'Monorepo Template',
        'Settings',
        'Security'
      ])
      expect(trail.getByRole('link', { name: 'Settings' })).toHaveAttribute('href', '/settings/profile')
      expect(trail.getByText('Security')).toHaveAttribute('aria-current', 'page')
    })

    it('goes back to the app from the settings', async () => {
      const history = renderShell({ path: '/settings/security' })

      fireEvent.click(
        within(screen.getByRole('navigation', { name: 'Settings' })).getByRole('link', { name: 'Back to app' })
      )

      await waitFor(() => expect(history.get()).toBe('/'))
      expect(screen.getByRole('navigation', { name: 'Main' })).toBeInTheDocument()
    })
  })

  it('speaks the language of the provider', () => {
    renderShell({ locale: 'pt-BR' })

    expect(
      within(screen.getByRole('navigation', { name: 'Principal' })).getByRole('link', { name: 'Início' })
    ).toBeInTheDocument()
  })

  describe('on phones', () => {
    it('opens the side menu as a drawer from the top bar, and closes it', async () => {
      renderShell()
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()

      fireEvent.click(screen.getByRole('button', { name: 'Open menu' }))

      const drawer = await screen.findByRole('dialog', { name: 'Menu' })
      expect(within(drawer).getByRole('link', { name: 'Home' })).toBeInTheDocument()
      fireEvent.click(within(drawer).getByRole('button', { name: 'Close menu' }))
      await waitFor(() => expect(screen.getByRole('dialog', { hidden: true })).toHaveAttribute('data-closed'))
    })

    it('closes the drawer when a link in it is followed, even to the screen already open', async () => {
      const history = renderShell({ path: '/' })
      fireEvent.click(screen.getByRole('button', { name: 'Open menu' }))

      fireEvent.click(within(await screen.findByRole('dialog')).getByRole('link', { name: 'Home' }))

      await waitFor(() => expect(screen.getByRole('dialog', { hidden: true })).toHaveAttribute('data-closed'))
      expect(history.get()).toBe('/')
    })

    it('hides the side menu and the breadcrumb below md, and the menu button from md up', () => {
      renderShell()

      expect(screen.getByRole('complementary', { hidden: true })).toHaveClass('hidden', 'md:block')
      expect(screen.getByRole('navigation', { name: 'You are here', hidden: true })).toHaveClass('hidden', 'md:block')
      expect(screen.getByRole('button', { name: 'Open menu' })).toHaveClass('md:hidden')
    })
  })

  describe('the service status', () => {
    const statusButton = (state: string) => screen.findByRole('button', { name: `Service status: ${state}` })

    it('is only an icon when all is well, with its state in the name', async () => {
      renderShell()

      expect(await statusButton('All systems normal')).toBeInTheDocument()
      expect(screen.queryByText('All systems normal')).not.toBeInTheDocument()
    })

    it('says a problem in a line above the account, before the user tries', async () => {
      renderShell({
        api: async () => Response.json({ ...health, status: 'degraded', database: 'down' }, { status: 503 })
      })

      expect(await screen.findByRole('status')).toHaveTextContent('Some features are not working')
      expect(screen.getByRole('status')).toHaveClass('text-warning')
    })

    it('says an unreachable service as an error', async () => {
      renderShell({
        api: async () => {
          throw new TypeError('Failed to fetch')
        }
      })

      const line = await screen.findByRole('status')
      expect(line).toHaveTextContent('Cannot reach the service')
      expect(line).toHaveClass('text-destructive')
    })

    it('opens the details: when it was checked, and a way to check again', async () => {
      const api = vi.fn<() => Promise<Response>>(async () => Response.json(health))
      renderShell({ api })
      const time = new Intl.DateTimeFormat('en', { timeStyle: 'medium' }).format(new Date(health.timestamp))

      fireEvent.click(await statusButton('All systems normal'))

      const details = await screen.findByRole('dialog', { name: 'Service status' })
      expect(details).toHaveTextContent(`Checked at ${time}`)
      fireEvent.click(within(details).getByRole('button', { name: 'Check again' }))
      await waitFor(() => expect(api).toHaveBeenCalledTimes(2))
    })

    it('gives the reference to quote to support when the API answered an error', async () => {
      const problem = {
        type: 'urn:problem:boom',
        title: 'Boom',
        status: 500,
        code: 'internal_error',
        requestId: '6f1c2a'
      }
      renderShell({ api: async () => Response.json(problem, { status: 500 }) })

      fireEvent.click(await statusButton('The service answered an error'))

      expect(await screen.findByRole('dialog', { name: 'Service status' })).toHaveTextContent(
        'If it keeps happening, tell support: internal_error · 6f1c2a'
      )
    })

    it('does not offer to check again while a check is running', () => {
      renderShell({ api: () => new Promise<Response>(() => {}) })

      fireEvent.click(screen.getByRole('button', { name: 'Service status: Checking the service…' }))

      expect(screen.getByRole('button', { name: 'Check again' })).toBeDisabled()
    })
  })
})
