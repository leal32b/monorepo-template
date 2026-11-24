import type { Subscription } from '@repo/contracts'
import { createMemoryHistory, MemoryRouter, Route } from '@solidjs/router'
import { fireEvent, render, screen, waitFor, within } from '@solidjs/testing-library'
import { Show } from 'solid-js'
import { ImpersonationProvider, rememberImpersonation } from '#entities/impersonations'
import { OrganizationsProvider, useOrganizations } from '#entities/organizations'
import { ApiProvider, AuthProvider, createApiClient, createAuthClient } from '#shared/api'
import { I18nProvider, type Locale } from '#shared/config'
import { visitToAcme } from '../../../test-back-office'
import { membershipOf } from '../../../test-membership'
import { createShell, ShellContext } from '../model/shell'
import { OrganizationMenu } from './organization-menu'

type AuthFetch = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>

const acme = { id: 'org-1', name: 'Acme', slug: 'acme', timeZone: 'UTC', currency: 'USD' as const }
const globex = { id: 'org-2', name: 'Globex', slug: 'globex', timeZone: 'UTC', currency: 'USD' as const }

const member = (id: string) => ({
  id,
  userId: `u-${id}`,
  role: 'member',
  createdAt: '2026-01-01T00:00:00.000Z',
  user: { name: id, email: `${id}@example.com` }
})

/** Better Auth's answers: the organizations, and three members in each. */
const answers: AuthFetch = async (input) =>
  String(input).includes('/organization/list-members')
    ? Response.json({ members: [member('a'), member('b'), member('c')], total: 3 })
    : Response.json([acme, globex])

/** Reads the organizations again, as deleting, leaving or joining one does, once they were read. */
function ReadAgain() {
  const { list, refetch } = useOrganizations()
  return (
    <Show when={list.state === 'ready'}>
      <button type="button" onClick={refetch}>
        Read again
      </button>
    </Show>
  )
}

function renderMenu({
  auth = answers,
  locale = 'en',
  logo,
  subscription = membershipOf(['owner'], {}).subscription,
  outside = false,
  visiting = false,
  unseen = false,
  invites = true
}: {
  auth?: AuthFetch
  locale?: Locale
  /** The logo the screen on view tells the frame (ADR 0076). */
  logo?: { url: string; width: number; height: number }
  subscription?: Subscription
  /** No organization to draw: the product's name instead. */
  outside?: boolean
  /** An operator's visit to Acme (ADR 0077). */
  visiting?: boolean
  /** No screen of Acme was on view yet, as on the person's settings after a fresh load. */
  unseen?: boolean
  /** Whether the caller's role may invite people, as the screen's membership says. */
  invites?: boolean
} = {}) {
  if (visiting) rememberImpersonation()
  const history = createMemoryHistory()
  history.set({ value: '/acme' })
  const shell = createShell({ signOut: () => undefined, failure: () => undefined })
  if (!unseen)
    shell.enter({
      organization: () => acme,
      logo: () => logo ?? null,
      subscription: () => subscription,
      invites: () => invites
    })
  render(() => (
    <ShellContext.Provider value={shell}>
      <I18nProvider locale={locale}>
        <ApiProvider
          client={createApiClient({
            fetch: async () => Response.json({ impersonation: visiting ? visitToAcme : null })
          })}
        >
          <AuthProvider client={createAuthClient({ fetch: auth })}>
            <ImpersonationProvider>
              <MemoryRouter history={history}>
                <Route path="/" component={OrganizationsProvider}>
                  <Route
                    path="/:orgSlug/*"
                    component={() => (
                      <>
                        <OrganizationMenu organization={outside ? undefined : acme} />
                        <ReadAgain />
                      </>
                    )}
                  />
                  <Route path="/onboarding" component={() => <p>The onboarding</p>} />
                </Route>
              </MemoryRouter>
            </ImpersonationProvider>
          </AuthProvider>
        </ApiProvider>
      </I18nProvider>
    </ShellContext.Provider>
  ))
  return history
}

const open = () => fireEvent.keyDown(screen.getByRole('button', { name: /Acme/ }), { key: 'Enter' })

/** Chooses a menu item the way a pointer does: released over it. */
const choose = (item: HTMLElement) => {
  fireEvent.pointerUp(item)
  fireEvent.click(item)
}

describe('OrganizationMenu (ADR 0080)', () => {
  afterEach(() => window.localStorage.clear())

  it('is named by the organization you are in, by a square mark', () => {
    renderMenu()

    const trigger = screen.getByRole('button', { name: /Acme/ })
    expect(trigger).toHaveTextContent('Acme')
    expect(trigger.querySelector('[aria-hidden="true"]')).toHaveClass('rounded-md')
  })

  it('draws the organization’s logo as its mark once it has one, its letter otherwise (ADR 0076)', () => {
    renderMenu({ logo: { url: '/api/storage/logos/org-1/l?signature=s', width: 64, height: 64 } })

    expect(screen.getByRole('button', { name: /Acme/ }).querySelector('img')).toHaveAttribute(
      'src',
      '/api/storage/logos/org-1/l?signature=s'
    )
  })

  it('heads its menu with the organization, its plan and how many people are in it', async () => {
    renderMenu()
    open()

    const menu = await screen.findByRole('menu')
    expect(menu.firstElementChild).toHaveTextContent('Acme')
    await waitFor(() => expect(menu.firstElementChild).toHaveTextContent('Trial · 3 members'))
  })

  it('names a paid plan, and one member as one', async () => {
    renderMenu({
      subscription: { ...membershipOf(['owner'], {}).subscription, status: 'active', plan: 'pro' },
      auth: async (input) =>
        String(input).includes('/organization/list-members')
          ? Response.json({ members: [member('a')], total: 1 })
          : Response.json([acme])
    })
    open()

    const menu = await screen.findByRole('menu')
    await waitFor(() => expect(menu.firstElementChild).toHaveTextContent('Pro · 1 member'))
  })

  it('says no plan once none is chosen, and no count when the members cannot be read', async () => {
    renderMenu({
      subscription: { ...membershipOf(['owner'], {}).subscription, status: 'cancelled', plan: null },
      auth: async (input) =>
        String(input).includes('/organization/list-members')
          ? Response.json({ code: 'INTERNAL_SERVER_ERROR' }, { status: 500 })
          : Response.json([acme])
    })
    open()

    const menu = await screen.findByRole('menu')
    await screen.findByRole('menuitemradio', { name: 'Acme' })
    expect(menu.firstElementChild?.lastElementChild).toHaveTextContent(/^$/)
  })

  it('says only how many people are in it while none of its screens said its plan', async () => {
    renderMenu({ unseen: true })
    open()

    const menu = await screen.findByRole('menu')
    await waitFor(() => expect(menu.firstElementChild?.lastElementChild).toHaveTextContent(/^3 members$/))
  })

  it('offers to invite people and the organization’s settings, then its organizations, then to create one', async () => {
    renderMenu()
    open()

    const menu = await screen.findByRole('menu')
    await within(menu).findByRole('menuitemradio', { name: 'Globex' })
    expect([...menu.querySelectorAll('[role^="menuitem"]')].map((item) => item.textContent)).toEqual([
      'Invite people',
      'Organization settings',
      'Acme',
      'Globex',
      'Create organization'
    ])
    expect(within(menu).getByRole('menuitemradio', { name: 'Acme' })).toHaveAttribute('aria-checked', 'true')
    expect(within(menu).getByRole('group', { name: 'Your organizations' })).toBeInTheDocument()
  })

  it('offers no invitation to a role that may not invite, as Home does not', async () => {
    renderMenu({ invites: false })
    open()

    const menu = await screen.findByRole('menu')
    expect(within(menu).queryByRole('menuitem', { name: 'Invite people' })).not.toBeInTheDocument()
    expect(within(menu).getByRole('menuitem', { name: 'Organization settings' })).toBeInTheDocument()
  })

  it('invites people from the members screen', async () => {
    const history = renderMenu()
    open()

    choose(await screen.findByRole('menuitem', { name: 'Invite people' }))

    await waitFor(() => expect(history.get()).toBe('/acme/settings/members'))
  })

  it('opens the organization’s settings, which phones list and the desktop opens on General', async () => {
    const history = renderMenu()
    open()

    choose(await screen.findByRole('menuitem', { name: 'Organization settings' }))

    await waitFor(() => expect(history.get()).toBe('/acme/settings'))
  })

  it('offers no invitation during an operator’s visit, nor counts its members (ADR 0077)', async () => {
    const auth = vi.fn(answers)
    renderMenu({ visiting: true, auth })
    await waitFor(() => expect(screen.getByRole('button', { name: /Acme/ })).toBeInTheDocument())
    // The visit is read before the menu is opened, as the banner reads it.
    await new Promise((resolve) => setTimeout(resolve, 0))
    open()

    const menu = await screen.findByRole('menu')
    expect(within(menu).queryByRole('menuitem', { name: 'Invite people' })).not.toBeInTheDocument()
    expect(auth.mock.calls.some(([input]) => String(input).includes('list-members'))).toBe(false)
  })

  it('opens the home of the organization chosen', async () => {
    const history = renderMenu()
    open()

    choose(await screen.findByRole('menuitemradio', { name: 'Globex' }))

    await waitFor(() => expect(history.get()).toBe('/globex'))
  })

  it('goes to onboarding to create another organization', async () => {
    const history = renderMenu()
    open()

    choose(await screen.findByRole('menuitem', { name: 'Create organization' }))

    expect(await screen.findByText('The onboarding')).toBeInTheDocument()
    expect(history.get()).toBe('/onboarding')
  })

  it('stays where it is when the current organization is chosen again', async () => {
    const history = renderMenu()
    open()

    choose(await screen.findByRole('menuitemradio', { name: 'Acme' }))

    expect(history.get()).toBe('/acme')
  })

  it('still lists the current organization and the way to create one when the list cannot be read', async () => {
    renderMenu({ auth: async () => Response.json({ code: 'INTERNAL_SERVER_ERROR' }, { status: 500 }) })
    open()

    const menu = await screen.findByRole('menu')
    expect(
      within(menu)
        .getAllByRole('menuitemradio')
        .map((item) => item.textContent)
    ).toEqual(['Acme'])
    expect(within(menu).getByRole('menuitem', { name: 'Create organization' })).toBeInTheDocument()
  })

  it('keeps every organization in the menu while the list is read again (W10)', async () => {
    let calls = 0
    renderMenu({
      auth: (input) =>
        String(input).includes('list-members')
          ? Promise.resolve(Response.json({ members: [], total: 0 }))
          : ++calls === 1
            ? Promise.resolve(Response.json([acme, globex]))
            : new Promise<Response>(() => {})
    })
    fireEvent.click(await screen.findByRole('button', { name: 'Read again' }))
    await waitFor(() => expect(calls).toBe(2))
    open()

    const menu = await screen.findByRole('menu')
    expect(
      within(menu)
        .getAllByRole('menuitemradio')
        .map((item) => item.textContent)
    ).toEqual(['Acme', 'Globex'])
  })

  it('is the product’s name outside any organization, which leads to creating one', () => {
    renderMenu({ outside: true })

    expect(screen.getByRole('link', { name: 'Monorepo Template' })).toHaveAttribute('href', '/onboarding')
  })

  it('speaks the language of the provider', async () => {
    renderMenu({ locale: 'pt-BR' })
    open()

    expect(await screen.findByRole('menuitem', { name: 'Criar organização' })).toBeInTheDocument()
    expect(screen.getByRole('menuitem', { name: 'Convidar pessoas' })).toBeInTheDocument()
    expect(screen.getByRole('menuitem', { name: 'Configurações da organização' })).toBeInTheDocument()
  })
})
