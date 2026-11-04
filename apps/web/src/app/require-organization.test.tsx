import { createMemoryHistory, MemoryRouter, Route } from '@solidjs/router'
import { fireEvent, render, screen } from '@solidjs/testing-library'
import { OrganizationsProvider, useOrganization } from '#entities/organizations'
import { ApiProvider, AuthProvider, createApiClient, createAuthClient } from '#shared/api'
import { I18nProvider, PaletteProvider } from '#shared/config'
import { RequireOrganization } from './require-organization'

type ApiFetch = (input: string, init?: RequestInit) => Promise<Response>

const acme = { id: 'org-1', name: 'Acme', slug: 'acme' }
const admin = { roles: ['admin'], permissions: { member: ['create'] } }

function Rights() {
  const { organization, can } = useOrganization()
  return (
    <p>
      {organization.name}: add members {String(can('member', 'create'))}
    </p>
  )
}

function renderAt(path: string, api: ApiFetch, organizations: unknown = [acme]) {
  const history = createMemoryHistory()
  history.set({ value: path })
  render(() => (
    <I18nProvider locale="en">
      <PaletteProvider>
        <ApiProvider client={createApiClient({ fetch: api })}>
          <AuthProvider client={createAuthClient({ fetch: async () => Response.json(organizations) })}>
            <MemoryRouter history={history}>
              <Route path="/" component={OrganizationsProvider}>
                <Route path="/:orgSlug" component={RequireOrganization}>
                  <Route path="/" component={Rights} />
                </Route>
              </Route>
            </MemoryRouter>
          </AuthProvider>
        </ApiProvider>
      </PaletteProvider>
    </I18nProvider>
  ))
}

describe('RequireOrganization', () => {
  afterEach(() => window.localStorage.clear())

  it('gives the screen its organization and what the caller may do there, and remembers it on this device', async () => {
    const api = vi.fn<ApiFetch>(async () => Response.json(admin))

    renderAt('/acme', api)

    expect(await screen.findByText('Acme: add members true')).toBeInTheDocument()
    expect(api).toHaveBeenCalledWith('/api/organizations/org-1/me', expect.anything())
    expect(window.localStorage.getItem('organization')).toBe('acme')
  })

  it('shows "not found" for a slug that is not one of the user’s organizations, without asking the API', async () => {
    const api = vi.fn<ApiFetch>(async () => Response.json(admin))

    renderAt('/globex', api)

    expect(await screen.findByRole('heading', { level: 1, name: 'Page not found' })).toBeInTheDocument()
    expect(api).not.toHaveBeenCalledWith(expect.stringContaining('/api/organizations/'), expect.anything())
    expect(window.localStorage.getItem('organization')).toBeNull()
  })

  it('shows "not found" when the API says the user is no longer a member', async () => {
    renderAt('/acme', async () => Response.json({ code: 'organization_not_found' }, { status: 404 }))

    expect(await screen.findByRole('heading', { level: 1, name: 'Page not found' })).toBeInTheDocument()
  })

  it('says what could not be read, and tries again when asked', async () => {
    let answers = 0
    renderAt('/acme', async () => (++answers === 1 ? Response.json({}, { status: 500 }) : Response.json(admin)))

    fireEvent.click(await screen.findByRole('button', { name: 'Try again' }))

    expect(await screen.findByText('Acme: add members true')).toBeInTheDocument()
  })

  it('says the organizations could not be read', async () => {
    const history = createMemoryHistory()
    history.set({ value: '/acme' })
    render(() => (
      <I18nProvider locale="en">
        <PaletteProvider>
          <ApiProvider client={createApiClient({ fetch: async () => Response.json(admin) })}>
            <AuthProvider client={createAuthClient({ fetch: async () => Response.json({}, { status: 503 }) })}>
              <MemoryRouter history={history}>
                <Route path="/" component={OrganizationsProvider}>
                  <Route path="/:orgSlug" component={RequireOrganization} />
                </Route>
              </MemoryRouter>
            </AuthProvider>
          </ApiProvider>
        </PaletteProvider>
      </I18nProvider>
    ))

    expect(
      await screen.findByRole('heading', { level: 1, name: 'We could not load your organizations' })
    ).toBeInTheDocument()
  })
})
