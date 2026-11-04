import { createMemoryHistory, MemoryRouter, Route, useNavigate } from '@solidjs/router'
import { fireEvent, render, screen } from '@solidjs/testing-library'
import { OrganizationsProvider, useOrganization, useOrganizations } from '#entities/organizations'
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

  describe('when the address of the organization changes under the screen', () => {
    function Controls() {
      const current = useOrganization()
      const { update } = useOrganizations()
      const navigate = useNavigate()
      return (
        <>
          <p>On {current.organization.slug}</p>
          <button type="button" onClick={() => update({ ...current.organization, slug: 'acme-inc' })}>
            Change address
          </button>
          <button type="button" onClick={() => navigate('/nowhere')}>
            Go elsewhere
          </button>
        </>
      )
    }

    function renderControls() {
      const history = createMemoryHistory()
      history.set({ value: '/acme' })
      render(() => (
        <I18nProvider locale="en">
          <PaletteProvider>
            <ApiProvider client={createApiClient({ fetch: async () => Response.json(admin) })}>
              <AuthProvider client={createAuthClient({ fetch: async () => Response.json([acme]) })}>
                <MemoryRouter history={history}>
                  <Route path="/" component={OrganizationsProvider}>
                    <Route path="/:orgSlug" component={RequireOrganization}>
                      <Route path="/" component={Controls} />
                    </Route>
                  </Route>
                </MemoryRouter>
              </AuthProvider>
            </ApiProvider>
          </PaletteProvider>
        </I18nProvider>
      ))
    }

    it('keeps the screen on the same organization, with its new address, while the URL catches up', async () => {
      renderControls()
      fireEvent.click(await screen.findByRole('button', { name: 'Change address' }))

      expect(await screen.findByText('On acme-inc')).toBeInTheDocument()
      expect(screen.queryByRole('heading', { name: 'Page not found' })).not.toBeInTheDocument()
    })

    it('still shows "not found" for an address that is not one of the user’s organizations', async () => {
      renderControls()
      fireEvent.click(await screen.findByRole('button', { name: 'Go elsewhere' }))

      expect(await screen.findByRole('heading', { level: 1, name: 'Page not found' })).toBeInTheDocument()
    })
  })
})
