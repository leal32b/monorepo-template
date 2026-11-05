import { createMemoryHistory, MemoryRouter, Route } from '@solidjs/router'
import { fireEvent, render, screen, waitFor, within } from '@solidjs/testing-library'
import { CurrentOrganizationProvider, type Organization, OrganizationsProvider } from '#entities/organizations'
import { SessionProvider } from '#entities/sessions'
import { ApiProvider, AuthProvider, createApiClient, createAuthClient } from '#shared/api'
import { I18nProvider, type Locale, PaletteProvider, ThemeProvider } from '#shared/config'
import { AppFrame } from './app-frame'
import { AppShell } from './app-shell'

type Fetch = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>

const health = { status: 'ok', service: 'api', timestamp: '2026-10-17T12:00:00.000Z', database: 'up' }

type Options = {
  auth?: Fetch
  api?: () => Promise<Response>
  locale?: Locale
  path?: string
  /** The organization of a tenant screen; none for a screen outside any, such as the account settings. */
  organization?: Organization
}

/** An app page at `/projects` in the shell, Better Auth and the API answering through `fetch`. */
function renderShell({
  auth,
  api = async () => Response.json(health),
  locale = 'en',
  path = '/projects',
  organization
}: Options = {}) {
  const membership = { roles: ['owner'], permissions: {} }
  const authFetch: Fetch =
    auth ??
    (async (input) =>
      String(input).includes('/organization/list')
        ? Response.json(organization === undefined ? [] : [organization])
        : Response.json({ success: true }))
  const history = createMemoryHistory()
  history.set({ value: path })
  render(() => (
    <I18nProvider locale={locale}>
      <ThemeProvider>
        <PaletteProvider>
          <ApiProvider client={createApiClient({ fetch: api })}>
            <AuthProvider client={createAuthClient({ fetch: authFetch })}>
              <SessionProvider user={{ id: 'u1', email: 'ada@example.com', name: 'Ada Lovelace' }}>
                <MemoryRouter
                  history={history}
                  root={(root) =>
                    organization === undefined ? (
                      <AppFrame>{root.children}</AppFrame>
                    ) : (
                      <OrganizationsProvider>
                        <CurrentOrganizationProvider organization={organization} membership={membership}>
                          <AppFrame>{root.children}</AppFrame>
                        </CurrentOrganizationProvider>
                      </OrganizationsProvider>
                    )
                  }
                >
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
                    path="/acme/settings/general"
                    component={() => (
                      <AppShell title="General">
                        <p>The general</p>
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
                  <Route
                    path="/settings/profile"
                    component={() => (
                      <AppShell title="Profile">
                        <p>The profile</p>
                      </AppShell>
                    )}
                  />
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

/** Chooses a menu item the way a pointer does: released over it. */
const choose = (item: HTMLElement) => {
  fireEvent.pointerUp(item)
  fireEvent.click(item)
}

/** The name the top bar shows on phones, in the span that desktop hides. */
const phoneTitle = () =>
  within(screen.getByRole('banner'))
    .getAllByText(/./, { selector: 'span' })
    .find((span) => span.classList.contains('md:hidden'))

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
    expect(trail.getAllByRole('listitem').map((crumb) => crumb.textContent)).toEqual(['Projects'])
    expect(trail.getByText('Projects')).toHaveAttribute('aria-current', 'page')
  })

  it('leads Home and the palette to the home of the organization in the URL (ADR 0034)', async () => {
    const history = renderShell({ organization: { id: 'org-1', name: 'Acme', slug: 'acme' } })

    expect(
      within(screen.getByRole('navigation', { name: 'Main' })).getByRole('link', { name: 'Home' })
    ).toHaveAttribute('href', '/acme')
    fireEvent.click(screen.getAllByRole('button', { name: 'Search' })[0] as HTMLElement)
    fireEvent.click(
      within(await screen.findByRole('dialog', { name: 'Command palette' })).getByRole('option', { name: 'Home' })
    )
    await waitFor(() => expect(history.get()).toBe('/acme'))
  })

  it('offers the organization’s screens in the palette, as the side menu does', async () => {
    const history = renderShell({ organization: { id: 'org-1', name: 'Acme', slug: 'acme' } })
    fireEvent.click(screen.getAllByRole('button', { name: 'Search' })[0] as HTMLElement)
    const dialog = within(await screen.findByRole('dialog', { name: 'Command palette' }))

    for (const name of ['General', 'Members', 'Roles']) expect(dialog.getByRole('option', { name })).toBeInTheDocument()
    fireEvent.click(dialog.getByRole('option', { name: 'Members' }))

    await waitFor(() => expect(history.get()).toBe('/acme/settings/members'))
  })

  it('puts the organization you are in at the top of the side menu, in place of the app’s name', () => {
    renderShell({ organization: { id: 'org-1', name: 'Acme', slug: 'acme' } })
    const menu = within(screen.getByRole('complementary', { hidden: true }))

    const switcher = menu.getByRole('button', { name: /Acme/ })
    expect(switcher.parentElement).toHaveClass('h-14')
    expect(menu.queryByRole('link', { name: 'Monorepo Template' })).not.toBeInTheDocument()
  })

  it('switches organization from the phone drawer, which closes after the move', async () => {
    const history = renderShell({ organization: { id: 'org-1', name: 'Acme', slug: 'acme' } })
    fireEvent.click(screen.getByRole('button', { name: 'Open menu' }))
    const drawer = await screen.findByRole('dialog', { name: 'Menu' })
    fireEvent.keyDown(within(drawer).getByRole('button', { name: /Acme/ }), { key: 'Enter' })

    choose(await screen.findByRole('menuitem', { name: 'Create organization' }))

    await waitFor(() => expect(history.get()).toBe('/onboarding'))
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Menu' })).not.toBeInTheDocument())
  })

  it('titles the side menu with the app, a link home, as tall as the top bar so the titles line up, with no line under it', () => {
    renderShell()
    const menu = screen.getByRole('complementary', { hidden: true })

    const title = within(menu).getByRole('link', { name: 'Monorepo Template' })
    expect(title).toHaveAttribute('href', '/')
    expect(title.parentElement).toHaveClass('h-14')
    expect(title.parentElement).not.toHaveClass('border-b')
    expect(screen.getByRole('banner')).toHaveClass('h-14', 'border-b')
  })

  it('puts the top bar in the same column as the screen, so the breadcrumb lines up with the title', () => {
    renderShell()

    const bar = screen.getByRole('banner').firstElementChild
    expect(bar).toHaveClass('max-w-3xl', 'mx-auto', 'md:px-6')
    expect(screen.getByRole('main')).toHaveClass('max-w-3xl', 'mx-auto', 'sm:px-6')
  })

  it('says the app in the phone top bar outside the settings', () => {
    renderShell()

    expect(phoneTitle()).toHaveTextContent('Monorepo Template')
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

  it('keeps the phone drawer open on the way to the settings, to pick another screen than the first', async () => {
    renderShell()
    fireEvent.click(screen.getByRole('button', { name: 'Open menu' }))
    const drawer = await screen.findByRole('dialog', { name: 'Menu' })
    fireEvent.keyDown(within(drawer).getByRole('button', { name: /Ada Lovelace/ }), { key: 'Enter' })

    choose(await screen.findByRole('menuitem', { name: 'Settings' }))

    // The Profile screen is up (behind the modal drawer, so hidden from the tree), the drawer still open.
    expect(await screen.findByRole('heading', { level: 1, name: 'Profile', hidden: true })).toBeInTheDocument()
    const open = await screen.findByRole('dialog', { name: 'Menu' })
    expect(within(open).getByRole('navigation', { name: 'Settings' })).toBeInTheDocument()
    expect(within(open).getByRole('link', { name: 'Security' })).toBeInTheDocument()
  })

  it('closes the drawer when the screen changes from outside it, as with the back button', async () => {
    const history = renderShell()
    fireEvent.click(screen.getByRole('button', { name: 'Open menu' }))
    await screen.findByRole('dialog', { name: 'Menu' })

    history.set({ value: '/' })

    await waitFor(() => expect(screen.getByRole('dialog', { hidden: true })).toHaveAttribute('data-closed'))
  })

  it('does not open a drawer on the way to the settings from the desktop menu', async () => {
    renderShell()
    openAccountMenu()

    choose(await screen.findByRole('menuitem', { name: 'Settings' }))

    expect(await screen.findByRole('heading', { level: 1, name: 'Profile' })).toBeInTheDocument()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('closes the drawer kept open for the settings once a link in it is followed', async () => {
    renderShell()
    fireEvent.click(screen.getByRole('button', { name: 'Open menu' }))
    const drawer = await screen.findByRole('dialog', { name: 'Menu' })
    fireEvent.keyDown(within(drawer).getByRole('button', { name: /Ada Lovelace/ }), { key: 'Enter' })
    choose(await screen.findByRole('menuitem', { name: 'Settings' }))
    await screen.findByRole('heading', { level: 1, name: 'Profile', hidden: true })
    const open = await screen.findByRole('dialog', { name: 'Menu' })

    fireEvent.click(within(open).getByRole('link', { name: 'Security' }))

    await waitFor(() => expect(screen.getByRole('dialog', { hidden: true })).toHaveAttribute('data-closed'))
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

  describe('kept across screens (ADR 0037)', () => {
    it('keeps the side menu and the top bar, and reads the service status once', async () => {
      const api = vi.fn(async () => Response.json(health))
      const history = renderShell({ api })
      const menu = screen.getByRole('navigation', { name: 'Main' }).closest('aside')
      await waitFor(() => expect(api).toHaveBeenCalledTimes(1))

      history.set({ value: '/' })

      expect(await screen.findByRole('heading', { level: 1, name: 'Start' })).toBeInTheDocument()
      expect(screen.getByRole('navigation', { name: 'Main' }).closest('aside')).toBe(menu)
      expect(within(screen.getByRole('navigation', { name: 'You are here' })).getByText('Start')).toBeInTheDocument()
      expect(api).toHaveBeenCalledTimes(1)
    })

    it('stands aside for a page of its own kind, and comes back with the next screen', async () => {
      const history = renderShell({
        auth: async () => Response.json({ code: 'INTERNAL_SERVER_ERROR' }, { status: 500 })
      })

      history.set({ value: '/login' })

      expect(await screen.findByText('The sign-in')).toBeInTheDocument()
      expect(screen.queryByRole('navigation', { name: 'Main' })).not.toBeInTheDocument()
      expect(screen.queryByRole('banner')).not.toBeInTheDocument()
      history.set({ value: '/projects' })
      expect(await screen.findByRole('navigation', { name: 'Main' })).toBeInTheDocument()
    })

    it('draws a frame of its own around a screen with none, as one drawn alone', () => {
      const history = createMemoryHistory()
      history.set({ value: '/' })
      render(() => (
        <I18nProvider locale="en">
          <ThemeProvider>
            <PaletteProvider>
              <ApiProvider client={createApiClient({ fetch: async () => Response.json(health) })}>
                <AuthProvider client={createAuthClient({ fetch: async () => Response.json({}) })}>
                  <SessionProvider user={{ id: 'u1', email: 'ada@example.com', name: 'Ada Lovelace' }}>
                    <MemoryRouter history={history}>
                      <Route
                        path="/"
                        component={() => (
                          <AppShell title="Alone">
                            <p>Alone</p>
                          </AppShell>
                        )}
                      />
                    </MemoryRouter>
                  </SessionProvider>
                </AuthProvider>
              </ApiProvider>
            </PaletteProvider>
          </ThemeProvider>
        </I18nProvider>
      ))

      expect(screen.getByRole('heading', { level: 1, name: 'Alone' })).toBeInTheDocument()
      expect(screen.getByRole('navigation', { name: 'Main' })).toBeInTheDocument()
    })
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

    it('puts the settings in the breadcrumb, before the screen', () => {
      renderShell({ path: '/settings/security' })

      const trail = within(screen.getByRole('navigation', { name: 'You are here' }))
      expect(trail.getAllByRole('listitem').map((crumb) => crumb.textContent)).toEqual(['Settings', 'Security'])
      expect(trail.getByRole('link', { name: 'Settings' })).toHaveAttribute('href', '/settings/profile')
      expect(trail.getByText('Security')).toHaveAttribute('aria-current', 'page')
    })

    it('titles the side menu "Settings" instead of the app, and not as a link', () => {
      renderShell({ path: '/settings/security' })
      const menu = screen.getByRole('complementary', { hidden: true })

      expect(within(menu).getByText('Settings', { selector: 'span' })).toBeInTheDocument()
      expect(within(menu).queryByRole('link', { name: 'Monorepo Template' })).not.toBeInTheDocument()
    })

    it('says "Settings" in the phone top bar inside the settings', () => {
      renderShell({ path: '/settings/security' })

      expect(phoneTitle()).toHaveTextContent('Settings')
    })

    it('draws the icon of the current screen in duotone, and the others in outline', () => {
      renderShell({ path: '/settings/security' })
      const menu = within(screen.getByRole('navigation', { name: 'Settings' }))
      const iconOf = (name: string) => menu.getByRole('link', { name }).querySelector('svg')?.innerHTML

      // Duotone draws a translucent layer under the line: the outline has none.
      expect(iconOf('Security')).toContain('opacity')
      expect(iconOf('Profile')).not.toContain('opacity')
      expect(iconOf('Back to app')).not.toContain('opacity')
    })

    describe('of an organization', () => {
      const acme = { id: 'org-1', name: 'Acme', slug: 'acme' }

      it('shares the settings’ menu: the organization’s own screens join the account’s, the current one marked', () => {
        renderShell({ path: '/acme/settings/general', organization: acme })

        const settings = within(screen.getByRole('navigation', { name: 'Settings' }))
        expect(settings.getByRole('link', { name: 'Profile' })).toHaveAttribute('href', '/settings/profile')
        const organization = within(settings.getByRole('list', { name: 'Organization' }))
        expect(organization.getAllByRole('link').map((link) => [link.textContent, link.getAttribute('href')])).toEqual([
          ['General', '/acme/settings/general'],
          ['Members', '/acme/settings/members'],
          ['Roles', '/acme/settings/roles']
        ])
        expect(organization.getByRole('link', { name: 'General' })).toHaveAttribute('aria-current', 'page')
      })

      it('goes back to the home of the organization, titles the menu "Settings" and puts the settings in the breadcrumb', () => {
        renderShell({ path: '/acme/settings/general', organization: acme })
        const menu = within(screen.getByRole('complementary', { hidden: true }))

        expect(menu.getByRole('link', { name: 'Back to app' })).toHaveAttribute('href', '/acme')
        expect(menu.getByText('Settings', { selector: 'span' })).toBeInTheDocument()
        expect(menu.queryByRole('button', { name: /Acme/ })).not.toBeInTheDocument()
        const trail = within(screen.getByRole('navigation', { name: 'You are here' }))
        expect(trail.getAllByRole('listitem').map((crumb) => crumb.textContent)).toEqual(['Settings', 'General'])
      })

      it('is not offered in the settings of a screen that has no organization to speak of', () => {
        renderShell({ path: '/settings/security' })

        expect(screen.queryByRole('list', { name: 'Organization' })).not.toBeInTheDocument()
      })
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

  describe('the command palette', () => {
    const openPalette = () => fireEvent.click(screen.getAllByRole('button', { name: 'Search' })[0] as HTMLElement)
    const palette = () => screen.findByRole('dialog', { name: 'Command palette' })
    const pick = async (name: string) => fireEvent.click(await screen.findByRole('option', { name }))

    afterEach(() => {
      localStorage.clear()
      delete document.documentElement.dataset.theme
    })

    it('opens from the search button in the top bar, with the screens and actions to choose', async () => {
      renderShell()
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()

      openPalette()

      const dialog = await palette()
      expect(
        within(dialog)
          .getAllByRole('option')
          .map((option) => option.textContent)
      ).toEqual([
        'Home',
        'Profile',
        'Security',
        'Preferences',
        'Create organization',
        'Use the system theme',
        'Use the light theme',
        'Use the dark theme',
        'Sign out'
      ])
    })

    it('tells the keys that open it, and ⌘ on an Apple device', () => {
      vi.spyOn(navigator, 'platform', 'get').mockReturnValue('MacIntel')
      renderShell()

      expect(screen.getAllByRole('button', { name: /Search/ })[1]).toHaveTextContent('⌘K')
      expect(screen.getAllByRole('button', { name: 'Search' })[0]).toHaveAttribute(
        'aria-keyshortcuts',
        'Control+K Meta+K'
      )
      vi.restoreAllMocks()
    })

    it('goes to a screen', async () => {
      const history = renderShell()
      openPalette()

      await pick('Security')

      await waitFor(() => expect(history.get()).toBe('/settings/security'))
    })

    it('finds a screen by a word that is not in its name', async () => {
      renderShell()
      openPalette()

      fireEvent.input(await screen.findByRole('combobox', { name: 'Command palette' }), {
        target: { value: 'password' }
      })

      expect(screen.getAllByRole('option').map((option) => option.textContent)).toEqual(['Security'])
    })

    it('says when nothing matches', async () => {
      renderShell()
      openPalette()

      fireEvent.input(await screen.findByRole('combobox', { name: 'Command palette' }), { target: { value: 'zzz' } })

      expect(screen.getByText('Nothing matches. Try another word.')).toBeInTheDocument()
    })

    it('changes the theme', async () => {
      renderShell()
      openPalette()

      await pick('Use the dark theme')

      expect(document.documentElement).toHaveAttribute('data-theme', 'dark')
      expect(localStorage.getItem('theme')).toBe('dark')
    })

    it('signs out, then leaves for the sign-in', async () => {
      const history = renderShell()
      openPalette()

      await pick('Sign out')

      await waitFor(() => expect(history.get()).toBe('/login'))
    })

    it('speaks the language of the provider', async () => {
      renderShell({ locale: 'pt-BR' })

      fireEvent.click(screen.getAllByRole('button', { name: 'Buscar' })[0] as HTMLElement)

      expect(await screen.findByRole('dialog', { name: 'Paleta de comandos' })).toBeInTheDocument()
    })
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
      expect(screen.getByRole('status').querySelector('svg')).toHaveAttribute('aria-hidden', 'true')
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
      const state = within(details).getByRole('status')
      expect(state).toHaveTextContent('All systems normal')
      expect(state.querySelector('span[aria-hidden="true"]')).toHaveClass('bg-success')
      expect(state).toHaveClass('flex', 'items-start')
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

      fireEvent.click(await statusButton('The service ran into a problem'))

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
