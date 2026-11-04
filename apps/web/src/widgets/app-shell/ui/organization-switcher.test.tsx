import { createMemoryHistory, MemoryRouter, Route } from '@solidjs/router'
import { fireEvent, render, screen, waitFor, within } from '@solidjs/testing-library'
import { CurrentOrganizationProvider, OrganizationsProvider } from '#entities/organizations'
import { ApiProvider, AuthProvider, createApiClient, createAuthClient } from '#shared/api'
import { I18nProvider, type Locale } from '#shared/config'
import { OrganizationSwitcher } from './organization-switcher'

type AuthFetch = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>

const acme = { id: 'org-1', name: 'Acme', slug: 'acme' }
const globex = { id: 'org-2', name: 'Globex', slug: 'globex' }

function renderSwitcher({
  auth = async () => Response.json([acme, globex]),
  locale = 'en',
  onNavigate
}: {
  auth?: AuthFetch
  locale?: Locale
  onNavigate?: () => void
} = {}) {
  const membership = { roles: ['owner'], permissions: {} }
  const history = createMemoryHistory()
  history.set({ value: '/acme' })
  render(() => (
    <I18nProvider locale={locale}>
      <ApiProvider client={createApiClient({ fetch: async () => Response.json(null) })}>
        <AuthProvider client={createAuthClient({ fetch: auth })}>
          <MemoryRouter history={history}>
            <Route path="/" component={OrganizationsProvider}>
              <Route
                path="/:orgSlug"
                component={() => (
                  <CurrentOrganizationProvider organization={acme} membership={membership}>
                    <OrganizationSwitcher onNavigate={onNavigate} />
                  </CurrentOrganizationProvider>
                )}
              />
              <Route path="/onboarding" component={() => <p>The onboarding</p>} />
            </Route>
          </MemoryRouter>
        </AuthProvider>
      </ApiProvider>
    </I18nProvider>
  ))
  return history
}

const open = () => fireEvent.keyDown(screen.getByRole('button', { name: /Acme/ }), { key: 'Enter' })

/** Chooses a menu item the way a pointer does: released over it. */
const choose = (item: HTMLElement) => {
  fireEvent.pointerUp(item)
  fireEvent.click(item)
}

describe('OrganizationSwitcher', () => {
  it('is named by the organization you are in', () => {
    renderSwitcher()

    expect(screen.getByRole('button', { name: /Acme/ })).toHaveTextContent('Acme')
  })

  it('lists the organizations of the user, the current one checked, and offers to create one', async () => {
    renderSwitcher()
    open()

    const menu = await screen.findByRole('menu')
    await within(menu).findByRole('menuitemradio', { name: 'Globex' })
    expect(
      within(menu)
        .getAllByRole('menuitemradio')
        .map((item) => [item.textContent, item.getAttribute('aria-checked')])
    ).toEqual([
      ['Acme', 'true'],
      ['Globex', 'false']
    ])
    expect(within(menu).getByRole('group', { name: 'Your organizations' })).toBeInTheDocument()
    expect(within(menu).getByRole('menuitem', { name: 'Create organization' })).toBeInTheDocument()
  })

  it('opens the home of the organization chosen, and tells the menu it navigated', async () => {
    const onNavigate = vi.fn()
    const history = renderSwitcher({ onNavigate })
    open()

    choose(await screen.findByRole('menuitemradio', { name: 'Globex' }))

    await waitFor(() => expect(history.get()).toBe('/globex'))
    expect(onNavigate).toHaveBeenCalledTimes(1)
  })

  it('goes to onboarding to create another organization', async () => {
    const onNavigate = vi.fn()
    const history = renderSwitcher({ onNavigate })
    open()

    choose(await screen.findByRole('menuitem', { name: 'Create organization' }))

    expect(await screen.findByText('The onboarding')).toBeInTheDocument()
    expect(history.get()).toBe('/onboarding')
    expect(onNavigate).toHaveBeenCalledTimes(1)
  })

  it('stays where it is when the current organization is chosen again', async () => {
    const onNavigate = vi.fn()
    const history = renderSwitcher({ onNavigate })
    open()

    choose(await screen.findByRole('menuitemradio', { name: 'Acme' }))

    expect(history.get()).toBe('/acme')
    expect(onNavigate).not.toHaveBeenCalled()
  })

  it('still lists the current organization and the way to create one when the list cannot be read', async () => {
    renderSwitcher({ auth: async () => Response.json({ code: 'INTERNAL_SERVER_ERROR' }, { status: 500 }) })
    open()

    const menu = await screen.findByRole('menu')
    expect(
      within(menu)
        .getAllByRole('menuitemradio')
        .map((item) => item.textContent)
    ).toEqual(['Acme'])
    expect(within(menu).getByRole('menuitem', { name: 'Create organization' })).toBeInTheDocument()
  })

  it('speaks the language of the provider', async () => {
    renderSwitcher({ locale: 'pt-BR' })
    open()

    expect(await screen.findByRole('menuitem', { name: 'Criar organização' })).toBeInTheDocument()
  })
})
