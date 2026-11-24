import type { OrganizationMembership } from '@repo/contracts'
import { createMemoryHistory, MemoryRouter, Route } from '@solidjs/router'
import { fireEvent, render, screen, waitFor, within } from '@solidjs/testing-library'
import { createResource, Suspense } from 'solid-js'
import { ImpersonationProvider, rememberImpersonation } from '#entities/impersonations'
import { CurrentOrganizationProvider, type Organization, OrganizationsProvider } from '#entities/organizations'
import { hasSession, rememberSession, SessionProvider } from '#entities/sessions'
import { ApiProvider, AuthProvider, createApiClient, createAuthClient } from '#shared/api'
import { I18nProvider, type Locale, PaletteProvider, ThemeProvider } from '#shared/config'
import { visitToAcme } from '../../../test-back-office'
import { membershipOf } from '../../../test-membership'
import { AppFrame } from './app-frame'
import { AppShell } from './app-shell'
import { AccountSettingsIndex, OrganizationSettingsIndex } from './settings-index'

type Fetch = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>

type Options = {
  auth?: Fetch
  locale?: Locale
  path?: string
  /** The organization of a tenant screen; none for a screen outside any, such as the account settings. */
  organization?: Organization
  /** What the members screen reads before it can be drawn: a navigation to it waits on this. */
  members?: () => Promise<string>
  /** The caller's membership in the organization: an owner on trial unless said. */
  membership?: OrganizationMembership
  /** An operator's visit to the organization, read only (ADR 0077). */
  visiting?: boolean
  /** The user's organizations, read for a screen outside any, as the person's settings are. */
  organizations?: Organization[]
}

/** A screen that reads what it shows, so a navigation to it waits, as the app's screens do. */
function Members(props: { read: () => Promise<string> }) {
  const [text] = createResource(props.read)
  return (
    <AppShell title="Members">
      <p>{text()}</p>
    </AppShell>
  )
}

/** An app page at `/projects` in the shell, Better Auth answering through `fetch`. */
function renderShell({
  auth,
  locale = 'en',
  path = '/projects',
  organization,
  members = async () => 'The members',
  membership = membershipOf(['owner'], {}),
  visiting = false,
  organizations
}: Options = {}) {
  if (visiting) rememberImpersonation()
  const api = createApiClient({
    fetch: async () =>
      Response.json({ impersonation: visiting && organization ? { ...visitToAcme, organization } : null })
  })
  const authFetch: Fetch =
    auth ??
    (async (input) =>
      String(input).includes('/organization/list')
        ? Response.json(organizations ?? (organization === undefined ? [] : [organization]))
        : Response.json({ success: true }))
  const history = createMemoryHistory()
  history.set({ value: path })
  render(() => (
    <I18nProvider locale={locale}>
      <ThemeProvider>
        <PaletteProvider>
          <AuthProvider client={createAuthClient({ fetch: authFetch })}>
            <SessionProvider user={{ id: 'u1', email: 'ada@example.com', name: 'Ada Lovelace' }}>
              <ApiProvider client={api}>
                <ImpersonationProvider>
                  <MemoryRouter
                    history={history}
                    // As in the app: the screens sit in the session's `Suspense`, which has already shown its content.
                    root={(root) => (
                      <Suspense>
                        {organizations !== undefined ? (
                          <OrganizationsProvider>
                            <AppFrame>{root.children}</AppFrame>
                          </OrganizationsProvider>
                        ) : organization === undefined ? (
                          <AppFrame>{root.children}</AppFrame>
                        ) : (
                          <OrganizationsProvider>
                            <CurrentOrganizationProvider organization={organization} membership={membership}>
                              <AppFrame>{root.children}</AppFrame>
                            </CurrentOrganizationProvider>
                          </OrganizationsProvider>
                        )}
                      </Suspense>
                    )}
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
                    <Route path="/acme/settings/members" component={() => <Members read={members} />} />
                    <Route
                      path="/acme/settings/billing"
                      component={() => (
                        <AppShell title="Plan and billing">
                          <p>The plans</p>
                        </AppShell>
                      )}
                    />
                    <Route
                      path="/invitation"
                      component={() => (
                        <AppShell title="Invitation to Globex" description="Grace Hopper invited you to Globex.">
                          <p>The answer</p>
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
                    <Route
                      path="/acme"
                      component={() => (
                        <AppShell title="Home">
                          <p>The home</p>
                        </AppShell>
                      )}
                    />
                    <Route
                      path="/acme/customers"
                      component={() => (
                        <AppShell title="Customers">
                          <p>The customers</p>
                        </AppShell>
                      )}
                    />
                    <Route path="/settings" component={AccountSettingsIndex} />
                    <Route path="/acme/settings" component={OrganizationSettingsIndex} />
                    <Route path="/login" component={() => <p>The sign-in</p>} />
                  </MemoryRouter>
                </ImpersonationProvider>
              </ApiProvider>
            </SessionProvider>
          </AuthProvider>
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

const acme = { id: 'org-1', name: 'Acme', slug: 'acme', timeZone: 'UTC', currency: 'USD' as const }

/** The side menu, which the desktop shows from `md`. */
const sideMenu = () => within(screen.getByRole('complementary', { hidden: true }))

const openPersonMenu = () => fireEvent.keyDown(screen.getByRole('button', { name: /Ada Lovelace/ }), { key: 'Enter' })

/** A window narrower than `md`, as a phone's: what the frame decides in code follows it. */
const onPhone = () =>
  vi.spyOn(window, 'matchMedia').mockReturnValue({
    matches: false,
    addEventListener: () => undefined,
    removeEventListener: () => undefined
  } as unknown as MediaQueryList)

describe('AppShell', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    window.localStorage.clear()
  })

  it('frames an app page: the side menu, the title and the content, with no top bar (ADR 0080)', () => {
    renderShell()

    const main = screen.getByRole('main')
    expect(within(main).getByRole('heading', { level: 1, name: 'Projects' })).toHaveFocus()
    expect(within(main).getByText('The projects')).toBeInTheDocument()
    expect(
      within(sideMenu().getByRole('navigation', { name: 'Main' })).getByRole('link', { name: 'Home' })
    ).toHaveAttribute('href', '/')
    expect(screen.queryByRole('navigation', { name: 'You are here' })).not.toBeInTheDocument()
    expect(screen.getByRole('main')).toHaveClass('max-w-3xl', 'mx-auto', 'sm:px-6')
  })

  it('leads Home and the palette to the home of the organization in the URL (ADR 0034)', async () => {
    const history = renderShell({ organization: acme })

    expect(
      within(sideMenu().getByRole('navigation', { name: 'Main' })).getByRole('link', { name: 'Home' })
    ).toHaveAttribute('href', '/acme')
    fireEvent.click(screen.getByRole('button', { name: 'Search' }))
    fireEvent.click(
      within(await screen.findByRole('dialog', { name: 'Command palette' })).getByRole('option', { name: 'Home' })
    )
    await waitFor(() => expect(history.get()).toBe('/acme'))
  })

  it('offers the organization’s customers in the side menu, the tab bar and the palette, from one list', async () => {
    const history = renderShell({ organization: acme })

    for (const menu of screen.getAllByRole('navigation', { name: 'Main' }))
      expect(within(menu).getByRole('link', { name: 'Customers' })).toHaveAttribute('href', '/acme/customers')
    fireEvent.click(screen.getByRole('button', { name: 'Search' }))
    fireEvent.click(
      within(await screen.findByRole('dialog', { name: 'Command palette' })).getByRole('option', { name: 'Customers' })
    )
    await waitFor(() => expect(history.get()).toBe('/acme/customers'))
  })

  it('offers the organization’s settings in the palette, as the side menu does', async () => {
    const history = renderShell({ organization: acme })
    fireEvent.click(screen.getByRole('button', { name: 'Search' }))
    const dialog = within(await screen.findByRole('dialog', { name: 'Command palette' }))

    for (const name of ['General', 'Members', 'Roles and permissions', 'Plan and billing', 'Activity'])
      expect(dialog.getByRole('option', { name })).toBeInTheDocument()
    fireEvent.click(dialog.getByRole('option', { name: 'Members' }))

    await waitFor(() => expect(history.get()).toBe('/acme/settings/members'))
  })

  describe('the subscription’s state (ADR 0063)', () => {
    const late = (roles: string[], permissions: OrganizationMembership['permissions']): OrganizationMembership => {
      const membership = membershipOf(roles, permissions)
      return {
        ...membership,
        subscription: {
          ...membership.subscription,
          status: 'past_due',
          plan: 'pro',
          periodStartsAt: '2026-10-03T00:00:00.000Z',
          paidThrough: '2026-11-03T00:00:00.000Z',
          pastDueSince: '2026-11-03T00:00:00.000Z'
        }
      }
    }

    it('is said below a tenant screen’s title, to the owner with the way to the plan page', () => {
      renderShell({ organization: acme, membership: late(['owner'], { billing: ['manage'] }) })

      const main = within(screen.getByRole('main'))
      const notice = main.getByRole('status')
      expect(notice).toHaveTextContent('We have not received the payment due on Nov 3, 2026.')
      expect(within(notice).getByRole('link', { name: 'Pay now' })).toHaveAttribute('href', '/acme/settings/billing')
      expect(main.getByRole('heading', { level: 1 }).parentElement?.nextElementSibling).toBe(notice)
    })

    it('tells another member who can act, with nothing to press', () => {
      renderShell({ organization: acme, membership: late(['member'], { customer: ['read'] }) })

      expect(within(screen.getByRole('main')).getByRole('status')).toHaveTextContent(
        "This organization's payment is late."
      )
      expect(within(screen.getByRole('main')).queryByRole('link')).not.toBeInTheDocument()
    })

    it('says nothing on the plan page, whose rows say where the subscription stands', () => {
      renderShell({
        path: '/acme/settings/billing',
        organization: acme,
        membership: late(['owner'], { billing: ['manage'] })
      })

      expect(within(screen.getByRole('main')).getByText('The plans')).toBeInTheDocument()
      expect(within(screen.getByRole('main')).queryByRole('status')).not.toBeInTheDocument()
    })

    it('says nothing on a screen outside any organization', () => {
      renderShell({ path: '/settings/profile', membership: late(['owner'], { billing: ['manage'] }) })

      expect(within(screen.getByRole('main')).queryByRole('status')).not.toBeInTheDocument()
    })
  })

  describe('the organization’s place, at the top (ADR 0080)', () => {
    it('puts the organization’s menu at the top of the side menu, as tall as a phone’s top row', () => {
      renderShell({ organization: acme })

      const menu = sideMenu().getByRole('button', { name: /Acme/ })
      expect(menu.parentElement).toHaveClass('h-14')
      expect(menu.querySelector('[aria-hidden="true"]')).toHaveClass('rounded-md')
      expect(sideMenu().queryByRole('link', { name: 'Monorepo Template' })).not.toBeInTheDocument()
    })

    it('puts the same menu in a top row of its own on phones', () => {
      renderShell({ organization: acme })

      const row = screen.getByRole('banner')
      expect(row).toHaveClass('sticky', 'h-14', 'md:hidden')
      expect(within(row).getByRole('button', { name: /Acme/ })).toBeInTheDocument()
    })

    it('names its plan and invites people from it', async () => {
      const history = renderShell({ organization: acme })
      fireEvent.keyDown(sideMenu().getByRole('button', { name: /Acme/ }), { key: 'Enter' })

      const menu = await screen.findByRole('menu')
      expect(menu.firstElementChild).toHaveTextContent('AcmeTrial')
      choose(within(menu).getByRole('menuitem', { name: 'Invite people' }))

      await waitFor(() => expect(history.get()).toBe('/acme/settings/members'))
    })

    it('keeps the organization of the person’s settings: the one `/` would open, with its screens', async () => {
      renderShell({ path: '/settings/security', organizations: [acme] })

      expect(await sideMenu().findByRole('button', { name: /Acme/ })).toBeInTheDocument()
      const organization = within(sideMenu().getByRole('list', { name: 'Organization' }))
      expect(organization.getByRole('link', { name: 'General' })).toHaveAttribute('href', '/acme/settings/general')
      expect(sideMenu().getByRole('link', { name: 'Back to Home' })).toHaveAttribute('href', '/acme')
    })

    it('keeps the logo and plan its screens said on a screen outside it', async () => {
      const history = renderShell({ organization: acme, membership: membershipOf(['owner'], {}) })
      history.set({ value: '/settings/security' })
      await screen.findByRole('heading', { level: 1, name: 'Security' })

      fireEvent.keyDown(sideMenu().getByRole('button', { name: /Acme/ }), { key: 'Enter' })

      expect((await screen.findByRole('menu')).firstElementChild).toHaveTextContent('AcmeTrial')
    })

    it('is the product’s name outside any organization, which leads to creating one', () => {
      renderShell()

      expect(sideMenu().getByRole('link', { name: 'Monorepo Template' })).toHaveAttribute('href', '/onboarding')
    })
  })

  it('opens the palette from the search row of the side menu, which tells the keys that open it', () => {
    vi.spyOn(navigator, 'platform', 'get').mockReturnValue('MacIntel')
    renderShell()

    const search = sideMenu().getByRole('button', { name: /Search/ })
    expect(search).toHaveTextContent('⌘K')
    expect(search).toHaveAttribute('aria-keyshortcuts', 'Control+K Meta+K')
    fireEvent.click(search)

    expect(screen.getByRole('dialog', { name: 'Command palette' })).toBeInTheDocument()
  })

  it('says what the screen is for in one line under its title, when it has one (ADR 0039)', () => {
    renderShell({ path: '/invitation' })

    const main = within(screen.getByRole('main'))
    const title = main.getByRole('heading', { level: 1, name: 'Invitation to Globex' })
    const line = main.getByText('Grace Hopper invited you to Globex.')
    expect(title.compareDocumentPosition(line) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(line.compareDocumentPosition(main.getByText('The answer')) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it('keeps one heading level 1 per screen', () => {
    renderShell()

    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1)
  })

  describe('the person’s place, at the foot of the side menu (ADR 0080)', () => {
    it('is named by who is signed in, by a round mark, and opens with the keyboard on their own settings', async () => {
      renderShell()
      const trigger = screen.getByRole('button', { name: /Ada Lovelace/ })
      expect(trigger.querySelector('[aria-hidden="true"]')).toHaveClass('rounded-full')

      openPersonMenu()

      const menu = await screen.findByRole('menu')
      expect(within(menu).getByText('ada@example.com')).toBeInTheDocument()
      expect(
        within(menu)
          .getAllByRole('menuitem')
          .map((item) => item.textContent)
      ).toEqual(['Profile', 'Security', 'Preferences', 'Sign out'])
    })

    it('goes to one of the person’s settings', async () => {
      const history = renderShell()
      openPersonMenu()

      choose(await screen.findByRole('menuitem', { name: 'Security' }))

      await waitFor(() => expect(history.get()).toBe('/settings/security'))
    })

    it('signs out, then leaves for the sign-in', async () => {
      const auth = vi.fn<Fetch>(async () => Response.json({ success: true }))
      const history = renderShell({ auth })
      openPersonMenu()

      choose(await screen.findByRole('menuitem', { name: 'Sign out' }))

      await waitFor(() => expect(history.get()).toBe('/login'))
      expect(String(auth.mock.calls[0]?.[0])).toBe(`${window.location.origin}/api/auth/sign-out`)
    })

    it('forgets on this device that a session was seen, once signed out, so the next visit asks for no organizations', async () => {
      rememberSession()
      const history = renderShell()
      openPersonMenu()

      choose(await screen.findByRole('menuitem', { name: 'Sign out' }))

      await waitFor(() => expect(history.get()).toBe('/login'))
      expect(hasSession()).toBe(false)
    })

    it('says when signing out failed, and stays', async () => {
      const history = renderShell({
        auth: async () => Response.json({ code: 'INTERNAL_SERVER_ERROR' }, { status: 500 })
      })
      openPersonMenu()

      choose(await screen.findByRole('menuitem', { name: 'Sign out' }))

      expect(await screen.findByRole('alert')).toHaveTextContent('Something went wrong on our side.')
      expect(history.get()).toBe('/projects')
    })
  })

  describe('kept across screens (ADR 0037)', () => {
    it('keeps the side menu', async () => {
      const history = renderShell()
      const menu = screen.getByRole('complementary', { hidden: true })

      history.set({ value: '/' })

      expect(await screen.findByRole('heading', { level: 1, name: 'Start' })).toBeInTheDocument()
      expect(screen.getByRole('complementary', { hidden: true })).toBe(menu)
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
      expect(await screen.findAllByRole('navigation', { name: 'Main' })).toHaveLength(2)
    })

    it('draws a frame of its own around a screen with none, as one drawn alone', () => {
      const history = createMemoryHistory()
      history.set({ value: '/' })
      render(() => (
        <I18nProvider locale="en">
          <ThemeProvider>
            <PaletteProvider>
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
            </PaletteProvider>
          </ThemeProvider>
        </I18nProvider>
      ))

      expect(screen.getByRole('heading', { level: 1, name: 'Alone' })).toBeInTheDocument()
      expect(screen.getAllByRole('navigation', { name: 'Main' })).toHaveLength(2)
    })
  })

  describe('in the settings', () => {
    it("offers an operator inside the organization only the settings it can read, under the visit's banner (ADR 0077)", async () => {
      renderShell({ path: '/acme/settings/general', organization: acme, visiting: true })

      expect(await screen.findByText('You are viewing Acme as its owner sees it')).toBeInTheDocument()
      const list = within(sideMenu().getByRole('list', { name: 'Organization' }))
      await waitFor(() =>
        expect(list.getAllByRole('link').map((link) => link.textContent)).toEqual(['General', 'Activity'])
      )
    })

    it('keeps the side menu’s top and foot, and swaps its screens for the way back and the person’s settings', () => {
      renderShell({ path: '/settings/security' })

      expect(sideMenu().getByRole('link', { name: 'Monorepo Template' })).toBeInTheDocument()
      expect(sideMenu().getByRole('button', { name: /Ada Lovelace/ })).toBeInTheDocument()
      expect(sideMenu().queryByRole('navigation', { name: 'Main' })).not.toBeInTheDocument()
      const settings = within(sideMenu().getByRole('navigation', { name: 'Settings' }))
      expect(settings.getByRole('link', { name: 'Back to Home' })).toHaveAttribute('href', '/')
      const account = within(settings.getByRole('list', { name: 'Your account' }))
      expect(account.getAllByRole('link').map((link) => [link.textContent, link.getAttribute('href')])).toEqual([
        ['Profile', '/settings/profile'],
        ['Security', '/settings/security'],
        ['Preferences', '/settings/preferences']
      ])
      expect(account.getByRole('link', { name: 'Security' })).toHaveAttribute('aria-current', 'page')
      expect(settings.queryByRole('list', { name: 'Organization' })).not.toBeInTheDocument()
    })

    it('draws the icon of the current screen in duotone, and the others in outline', () => {
      renderShell({ path: '/settings/security' })
      const menu = within(sideMenu().getByRole('navigation', { name: 'Settings' }))
      const iconOf = (name: string) => menu.getByRole('link', { name }).querySelector('svg')?.innerHTML

      // Duotone draws a translucent layer under the line: the outline has none.
      expect(iconOf('Security')).toContain('opacity')
      expect(iconOf('Profile')).not.toContain('opacity')
      expect(iconOf('Back to Home')).not.toContain('opacity')
    })

    describe('of an organization', () => {
      it('lists the organization’s settings first, then the person’s, the current one marked', () => {
        renderShell({ path: '/acme/settings/general', organization: acme })

        const settings = within(sideMenu().getByRole('navigation', { name: 'Settings' }))
        expect(settings.getAllByRole('list')).toHaveLength(2)
        const [first, second] = settings.getAllByRole('list')
        expect(first).toBe(settings.getByRole('list', { name: 'Organization' }))
        expect(second).toBe(settings.getByRole('list', { name: 'Your account' }))
        const organization = within(first as HTMLElement)
        expect(organization.getAllByRole('link').map((link) => [link.textContent, link.getAttribute('href')])).toEqual([
          ['General', '/acme/settings/general'],
          ['Members', '/acme/settings/members'],
          ['Roles and permissions', '/acme/settings/roles'],
          ['Plan and billing', '/acme/settings/billing'],
          ['Activity', '/acme/settings/activity']
        ])
        expect(organization.getByRole('link', { name: 'General' })).toHaveAttribute('aria-current', 'page')
      })

      it('goes back to Home when no product screen of the organization was on view', () => {
        renderShell({ path: '/acme/settings/general', organization: acme })

        expect(sideMenu().getByRole('link', { name: 'Back to Home' })).toHaveAttribute('href', '/acme')
        expect(sideMenu().getByRole('button', { name: /Acme/ })).toBeInTheDocument()
      })

      it('goes back to the last product screen on view, by its name', async () => {
        const history = renderShell({ path: '/acme/customers', organization: acme })
        await screen.findByRole('heading', { level: 1, name: 'Customers' })

        history.set({ value: '/acme/settings/general' })

        const back = await sideMenu().findByRole('link', { name: 'Back to Customers' })
        expect(back).toHaveAttribute('href', '/acme/customers')
        fireEvent.click(back)
        await waitFor(() => expect(history.get()).toBe('/acme/customers'))
        expect(sideMenu().getByRole('navigation', { name: 'Main' })).toBeInTheDocument()
      })

      it('opens the screen chosen at once, its title over its skeleton until its data is in (ADR 0038)', async () => {
        let arrive: (text: string) => void = () => undefined
        const members = vi.fn(
          () =>
            new Promise<string>((resolve) => {
              arrive = resolve
            })
        )
        const history = renderShell({ path: '/acme/settings/general', organization: acme, members })
        const list = within(screen.getByRole('list', { name: 'Organization' }))

        fireEvent.click(list.getByRole('link', { name: 'Members' }))

        expect(list.getByRole('link', { name: 'Members' })).toHaveAttribute('aria-current', 'page')
        expect(list.getByRole('link', { name: 'General' })).not.toHaveAttribute('aria-current')
        expect(await screen.findByRole('heading', { level: 1, name: 'Members' })).toBeInTheDocument()
        await waitFor(() => expect(history.get()).toBe('/acme/settings/members'))
        expect(screen.queryByText('The general')).not.toBeInTheDocument()
        expect(await within(screen.getByRole('main')).findByRole('status')).toHaveTextContent('Loading…')
        arrive('The members')
        expect(await screen.findByText('The members')).toBeInTheDocument()
        expect(within(screen.getByRole('main')).queryByRole('status')).not.toBeInTheDocument()
      })
    })
  })

  it('speaks the language of the provider', () => {
    renderShell({ locale: 'pt-BR' })

    expect(
      within(sideMenu().getByRole('navigation', { name: 'Principal' })).getByRole('link', { name: 'Início' })
    ).toBeInTheDocument()
  })

  describe('the command palette', () => {
    const openPalette = () => fireEvent.click(screen.getByRole('button', { name: 'Search' }))
    const palette = () => screen.findByRole('dialog', { name: 'Command palette' })
    const pick = async (name: string) => fireEvent.click(await screen.findByRole('option', { name }))

    afterEach(() => {
      delete document.documentElement.dataset.theme
    })

    it('opens from Search, with the screens and actions to choose', async () => {
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

      fireEvent.click(screen.getByRole('button', { name: 'Buscar' }))

      expect(await screen.findByRole('dialog', { name: 'Paleta de comandos' })).toBeInTheDocument()
    })
  })

  describe('on phones (ADR 0080)', () => {
    it('hides the side menu below md, and the top row and the tab bar from md up', () => {
      renderShell({ organization: acme })

      expect(screen.getByRole('complementary', { hidden: true })).toHaveClass('hidden', 'md:block')
      expect(screen.getByRole('banner')).toHaveClass('md:hidden')
      const [, tabs] = screen.getAllByRole('navigation', { name: 'Main' })
      expect(tabs).toHaveClass('md:hidden')
    })

    it('leaves the tab bar its room at the foot of the screen', () => {
      renderShell()

      expect(screen.getByRole('main').parentElement?.parentElement).toHaveClass(
        'pb-[calc(4rem+env(safe-area-inset-bottom))]',
        'md:pb-0'
      )
    })

    it('links a setting of the person back to You, above its title', () => {
      renderShell({ path: '/settings/security' })

      const main = within(screen.getByRole('main'))
      const back = main.getByRole('link', { name: 'You' })
      expect(back).toHaveAttribute('href', '/settings')
      expect(back).toHaveClass('md:hidden')
      expect(back.nextElementSibling).toBe(main.getByRole('heading', { level: 1 }))
    })

    it('links a setting of the organization back to its list', () => {
      renderShell({ path: '/acme/settings/general', organization: acme })

      expect(within(screen.getByRole('main')).getByRole('link', { name: 'Organization settings' })).toHaveAttribute(
        'href',
        '/acme/settings'
      )
    })

    it('draws no way back on a screen outside the settings', () => {
      renderShell({ organization: acme })

      expect(within(screen.getByRole('main')).queryByRole('link')).not.toBeInTheDocument()
    })

    describe('You', () => {
      it('is a screen with the person’s three settings and signing out', async () => {
        onPhone()
        renderShell({ path: '/settings' })

        const main = within(await screen.findByRole('main'))
        expect(main.getByRole('heading', { level: 1, name: 'You' })).toBeInTheDocument()
        expect(main.getByText('Signed in as ada@example.com')).toBeInTheDocument()
        const list = within(main.getByRole('navigation', { name: 'Your account' }))
        expect(list.getAllByRole('link').map((link) => [link.textContent, link.getAttribute('href')])).toEqual([
          ['Profile', '/settings/profile'],
          ['Security', '/settings/security'],
          ['Preferences', '/settings/preferences']
        ])
        expect(screen.getByRole('link', { name: /You/, current: 'page' })).toHaveAttribute('href', '/settings')
      })

      it('signs out', async () => {
        onPhone()
        const history = renderShell({ path: '/settings' })

        fireEvent.click(within(await screen.findByRole('main')).getByRole('button', { name: 'Sign out' }))

        await waitFor(() => expect(history.get()).toBe('/login'))
      })

      it('opens the profile instead on the desktop, where the side menu lists the settings', async () => {
        const history = renderShell({ path: '/settings' })

        await waitFor(() => expect(history.get()).toBe('/settings/profile'))
      })
    })

    describe('the organization’s settings', () => {
      it('are a screen that lists them', async () => {
        onPhone()
        renderShell({ path: '/acme/settings', organization: acme })

        const main = within(await screen.findByRole('main'))
        expect(main.getByRole('heading', { level: 1, name: 'Organization settings' })).toBeInTheDocument()
        expect(
          within(main.getByRole('navigation', { name: 'Organization settings' }))
            .getAllByRole('link')
            .map((link) => link.textContent)
        ).toEqual(['General', 'Members', 'Roles and permissions', 'Plan and billing', 'Activity'])
      })

      it('list only those an operator’s visit can read (ADR 0077)', async () => {
        onPhone()
        renderShell({ path: '/acme/settings', organization: acme, visiting: true })

        const main = within(await screen.findByRole('main'))
        await waitFor(() =>
          expect(
            within(main.getByRole('navigation', { name: 'Organization settings' }))
              .getAllByRole('link')
              .map((link) => link.textContent)
          ).toEqual(['General', 'Activity'])
        )
      })

      it('open General instead on the desktop', async () => {
        const history = renderShell({ path: '/acme/settings', organization: acme })

        await waitFor(() => expect(history.get()).toBe('/acme/settings/general'))
      })
    })
  })
})
