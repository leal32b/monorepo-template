import { createMemoryHistory, MemoryRouter, Route } from '@solidjs/router'
import { fireEvent, render, screen, waitFor } from '@solidjs/testing-library'
import { OrganizationsProvider, rememberOrganization } from '#entities/organizations'
import { ApiProvider, AuthProvider, createApiClient, createAuthClient } from '#shared/api'
import { I18nProvider, PaletteProvider } from '#shared/config'
import { OrganizationRedirect } from './organization-redirect'

type AuthFetch = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>

const acme = { id: 'org-1', name: 'Acme', slug: 'acme', timeZone: 'UTC', currency: 'USD' as const }
const globex = { id: 'org-2', name: 'Globex', slug: 'globex', timeZone: 'UTC', currency: 'USD' as const }

function renderRoot(auth: AuthFetch) {
  const history = createMemoryHistory()
  history.set({ value: '/' })
  render(() => (
    <I18nProvider locale="en">
      <PaletteProvider>
        <ApiProvider client={createApiClient({ fetch: async () => Response.json(null) })}>
          <AuthProvider client={createAuthClient({ fetch: auth })}>
            <MemoryRouter history={history}>
              <Route path="/" component={OrganizationsProvider}>
                <Route path="/" component={OrganizationRedirect} />
                <Route path="/onboarding" component={() => <p>The onboarding</p>} />
                <Route path="/:orgSlug" component={() => <p>An organization</p>} />
              </Route>
            </MemoryRouter>
          </AuthProvider>
        </ApiProvider>
      </PaletteProvider>
    </I18nProvider>
  ))
  return history
}

describe('OrganizationRedirect', () => {
  afterEach(() => window.localStorage.clear())

  it('opens the organization last opened on this device', async () => {
    rememberOrganization('globex')

    const history = renderRoot(async () => Response.json([acme, globex]))

    await waitFor(() => expect(history.get()).toBe('/globex'))
  })

  it('opens the first organization when none was opened here before', async () => {
    const history = renderRoot(async () => Response.json([acme, globex]))

    await waitFor(() => expect(history.get()).toBe('/acme'))
  })

  it('sends someone without an organization to onboarding', async () => {
    const history = renderRoot(async () => Response.json([]))

    expect(await screen.findByText('The onboarding')).toBeInTheDocument()
    expect(history.get()).toBe('/onboarding')
  })

  it('says the organizations could not be read, and tries again when asked', async () => {
    let answers = 0
    const history = renderRoot(async () =>
      ++answers === 1 ? Response.json({}, { status: 500 }) : Response.json([acme])
    )

    expect(
      await screen.findByRole('heading', { level: 1, name: 'We could not load your organizations' })
    ).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }))

    await waitFor(() => expect(history.get()).toBe('/acme'))
  })
})
