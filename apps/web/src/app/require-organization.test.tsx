import { A, createMemoryHistory, MemoryRouter, Route, useNavigate } from '@solidjs/router'
import { fireEvent, render, screen, waitFor } from '@solidjs/testing-library'
import { type Component, createResource, type ParentProps, Show, Suspense } from 'solid-js'
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

  describe('while the organizations are read again (W10)', () => {
    const globex = { id: 'org-2', name: 'Globex', slug: 'globex' }

    /** Better Auth's list: the first answer at once, each one after it when the test lets it. */
    function lists(first: unknown) {
      const later: Array<(response: Response) => void> = []
      let calls = 0
      const fetch = vi.fn(() =>
        ++calls === 1
          ? Promise.resolve(Response.json(first))
          : new Promise<Response>((resolve) => {
              later.push(resolve)
            })
      )
      return { fetch, answer: (organizations: unknown) => later.shift()?.(Response.json(organizations)) }
    }

    function renderReading(path: string, auth: () => Promise<Response>, Screen: Component) {
      const history = createMemoryHistory()
      history.set({ value: path })
      render(() => (
        <I18nProvider locale="en">
          <PaletteProvider>
            <ApiProvider client={createApiClient({ fetch: async () => Response.json(admin) })}>
              <AuthProvider client={createAuthClient({ fetch: auth })}>
                <MemoryRouter history={history}>
                  <Route path="/" component={OrganizationsProvider}>
                    <Route path="/elsewhere" component={Screen} />
                    <Route path="/:orgSlug" component={RequireOrganization}>
                      <Route path="/" component={Screen} />
                    </Route>
                  </Route>
                </MemoryRouter>
              </AuthProvider>
            </ApiProvider>
          </PaletteProvider>
        </I18nProvider>
      ))
      return history
    }

    it('keeps the screen on view, without drawing it anew', async () => {
      const { fetch, answer } = lists([acme])
      let drawn = 0
      function Counted() {
        drawn += 1
        const { refetch } = useOrganizations()
        return (
          <>
            <Rights />
            <button type="button" onClick={refetch}>
              Read again
            </button>
          </>
        )
      }
      renderReading('/acme', fetch, Counted)
      fireEvent.click(await screen.findByRole('button', { name: 'Read again' }))

      await waitFor(() => expect(fetch).toHaveBeenCalledTimes(2))
      expect(screen.getByText('Acme: add members true')).toBeInTheDocument()
      answer([acme, globex])
      await waitFor(() => expect(screen.getByText('Acme: add members true')).toBeInTheDocument())
      expect(drawn).toBe(1)
    })

    it('opens an organization only the list read again has, waiting for it instead of saying "not found"', async () => {
      const { fetch, answer } = lists([acme])
      /** Joins Globex once the organizations were read, as accepting its invitation does. */
      function Joining() {
        const { list, refetch } = useOrganizations()
        const navigate = useNavigate()
        return (
          <Show when={list.state === 'ready'}>
            <button
              type="button"
              onClick={() => {
                refetch()
                navigate('/globex')
              }}
            >
              Join Globex
            </button>
          </Show>
        )
      }
      const history = renderReading('/elsewhere', fetch, Joining)
      fireEvent.click(await screen.findByRole('button', { name: 'Join Globex' }))

      await waitFor(() => expect(history.get()).toBe('/globex'))
      expect(screen.queryByRole('heading', { name: 'Page not found' })).not.toBeInTheDocument()
      answer([acme, globex])
      expect(await screen.findByRole('button', { name: 'Join Globex' })).toBeInTheDocument()
      expect(screen.queryByRole('heading', { name: 'Page not found' })).not.toBeInTheDocument()
    })

    it('says "not found" once the list read again does not have it', async () => {
      const { fetch, answer } = lists([acme])
      let leave = () => {}
      function Leaving() {
        const { refetch } = useOrganizations()
        leave = refetch
        return <Rights />
      }
      renderReading('/acme', fetch, Leaving)
      await screen.findByText('Acme: add members true')

      leave()
      await waitFor(() => expect(fetch).toHaveBeenCalledTimes(2))
      answer([globex])

      expect(await screen.findByRole('heading', { level: 1, name: 'Page not found' })).toBeInTheDocument()
    })
  })

  describe('coming from another screen', () => {
    const globex = { id: 'org-2', name: 'Globex', slug: 'globex' }
    const member = { roles: ['member'], permissions: {} }

    /** A screen outside the organizations, with links into them once they are read, as the account settings have. */
    function Elsewhere() {
      const { list } = useOrganizations()
      return (
        <>
          <p>The account</p>
          <Show when={list.state === 'ready'}>
            <A href="/acme">To Acme</A>
            <A href="/globex">To Globex</A>
          </Show>
        </>
      )
    }
    function Links(props: ParentProps) {
      return (
        <>
          {props.children}
          <A href="/elsewhere">Back to the account</A>
          <A href="/globex">To Globex</A>
        </>
      )
    }

    /** As in the app: the screens sit in the session's `Suspense`, which has already shown its content. */
    function renderFrom(
      path: string,
      api: ApiFetch,
      screen: Component = () => (
        <Links>
          <Rights />
        </Links>
      )
    ) {
      const history = createMemoryHistory()
      history.set({ value: path })
      render(() => (
        <I18nProvider locale="en">
          <PaletteProvider>
            <ApiProvider client={createApiClient({ fetch: api })}>
              <AuthProvider client={createAuthClient({ fetch: async () => Response.json([acme, globex]) })}>
                <MemoryRouter history={history} root={(props) => <Suspense>{props.children}</Suspense>}>
                  <Route path="/" component={OrganizationsProvider}>
                    <Route path="/elsewhere" component={Elsewhere} />
                    <Route path="/:orgSlug" component={RequireOrganization}>
                      <Route path="/" component={screen} />
                    </Route>
                  </Route>
                </MemoryRouter>
              </AuthProvider>
            </ApiProvider>
          </PaletteProvider>
        </I18nProvider>
      ))
      return history
    }

    /** An API whose answers come only when the test lets them, one per call. */
    function slowApi() {
      const answers: Array<(response: Response) => void> = []
      const api = vi.fn<ApiFetch>(() => new Promise((resolve) => answers.push(resolve)))
      return { api, answer: (response: Response) => answers.shift()?.(response) }
    }

    it('opens the organization at once, its skeleton holding the place until the membership is in', async () => {
      const { api, answer } = slowApi()
      const history = renderFrom('/elsewhere', api)

      fireEvent.click(await screen.findByRole('link', { name: 'To Acme' }))

      await waitFor(() => expect(history.get()).toBe('/acme'))
      expect(screen.queryByText('The account')).not.toBeInTheDocument()
      expect(await screen.findByRole('status')).toHaveTextContent('Loading…')
      answer(Response.json(admin))
      expect(await screen.findByText('Acme: add members true')).toBeInTheDocument()
    })

    it('swaps to another organization at once, its skeleton holding the place until its membership is in', async () => {
      const { api, answer } = slowApi()
      const history = renderFrom('/acme', api)
      await waitFor(() => expect(api).toHaveBeenCalledTimes(1))
      answer(Response.json(admin))
      fireEvent.click(await screen.findByRole('link', { name: 'To Globex' }))

      await waitFor(() => expect(history.get()).toBe('/globex'))
      expect(screen.queryByText('Acme: add members true')).not.toBeInTheDocument()
      answer(Response.json(member))
      expect(await screen.findByText('Globex: add members false')).toBeInTheDocument()
    })

    it('draws an organization visited before at once, and takes what the API says behind it', async () => {
      const { api, answer } = slowApi()
      renderFrom('/acme', api)
      await waitFor(() => expect(api).toHaveBeenCalledTimes(1))
      answer(Response.json(admin))
      fireEvent.click(await screen.findByRole('link', { name: 'Back to the account' }))
      fireEvent.click(await screen.findByRole('link', { name: 'To Acme' }))

      expect(await screen.findByText('Acme: add members true')).toBeInTheDocument()
      await waitFor(() => expect(api).toHaveBeenCalledTimes(2))
      answer(Response.json(member))
      expect(await screen.findByText('Acme: add members false')).toBeInTheDocument()
    })

    it('says "not found" when the check behind says the caller is no longer a member', async () => {
      let calls = 0
      renderFrom('/acme', async () =>
        ++calls === 1 ? Response.json(admin) : Response.json({ code: 'organization_not_found' }, { status: 404 })
      )
      fireEvent.click(await screen.findByRole('link', { name: 'Back to the account' }))
      fireEvent.click(await screen.findByRole('link', { name: 'To Acme' }))

      expect(await screen.findByRole('heading', { level: 1, name: 'Page not found' })).toBeInTheDocument()
    })

    it('keeps what it knows when the check behind fails for another reason', async () => {
      let calls = 0
      renderFrom('/acme', async () => (++calls === 1 ? Response.json(admin) : Response.json({}, { status: 500 })))
      fireEvent.click(await screen.findByRole('link', { name: 'Back to the account' }))
      fireEvent.click(await screen.findByRole('link', { name: 'To Acme' }))

      await waitFor(() => expect(calls).toBe(2))
      expect(await screen.findByText('Acme: add members true')).toBeInTheDocument()
      expect(screen.queryByRole('button', { name: 'Try again' })).not.toBeInTheDocument()
    })

    it('draws the screens anew for another organization: the one leaving never reads the next (W13)', async () => {
      const answers = new Map<string, (team: string) => void>()
      const teams = vi.fn(
        (id: string) =>
          new Promise<string>((resolve) => {
            answers.set(id, resolve)
          })
      )
      /** A screen that reads its organization's data, as the settings do, and keeps it while it reads again. */
      function Team() {
        const current = useOrganization()
        const [team] = createResource(() => current.organization.id, teams)
        return (
          <>
            <p>{team.latest}</p>
            <A href="/acme">To Acme</A>
            <A href="/globex">To Globex</A>
          </>
        )
      }
      const asked = () => teams.mock.calls.map(([id]) => id)
      const history = renderFrom('/acme', async () => Response.json(admin), Team)
      await waitFor(() => expect(asked()).toEqual(['org-1']))
      answers.get('org-1')?.('The team of Acme')

      fireEvent.click(await screen.findByRole('link', { name: 'To Globex' }))
      await waitFor(() => expect(asked()).toContain('org-2'))
      answers.get('org-2')?.('The team of Globex')
      await screen.findByText('The team of Globex')
      expect(asked()).toEqual(['org-1', 'org-2'])

      fireEvent.click(screen.getByRole('link', { name: 'To Acme' }))
      await waitFor(() => expect(asked()).toEqual(['org-1', 'org-2', 'org-1']))
      await waitFor(() => expect(history.get()).toBe('/acme'))
      expect(screen.queryByText('The team of Globex')).not.toBeInTheDocument()
      answers.get('org-1')?.('The team of Acme')
      expect(await screen.findByText('The team of Acme')).toBeInTheDocument()
    })

    it('drops a late answer about an organization the screen has left', async () => {
      const { api, answer } = slowApi()
      renderFrom('/acme', api)
      await waitFor(() => expect(api).toHaveBeenCalledTimes(1))
      answer(Response.json(admin))
      fireEvent.click(await screen.findByRole('link', { name: 'Back to the account' }))
      fireEvent.click(await screen.findByRole('link', { name: 'To Acme' }))
      await screen.findByText('Acme: add members true')
      fireEvent.click(await screen.findByRole('link', { name: 'To Globex' }))
      await waitFor(() => expect(api).toHaveBeenCalledTimes(3))

      answer(new Response(null, { status: 404 }))
      answer(Response.json(member))

      expect(await screen.findByText('Globex: add members false')).toBeInTheDocument()
    })
  })
})
