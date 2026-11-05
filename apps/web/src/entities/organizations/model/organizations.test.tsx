import { MemoryRouter, Route } from '@solidjs/router'
import { render, screen } from '@solidjs/testing-library'
import { type JSX, Show } from 'solid-js'
import { AuthProvider, createAuthClient } from '#shared/api'
import { OrganizationsProvider, useOptionalOrganizations, useOrganizations } from './organizations'

function Names() {
  const { list, refetch } = useOrganizations()
  return (
    <>
      <Show when={list()}>
        {(organizations) => (
          <p>
            {organizations()
              .map((o) => o.name)
              .join(', ')}
          </p>
        )}
      </Show>
      <button type="button" onClick={refetch}>
        Again
      </button>
    </>
  )
}

/** As in the app, the provider sits under the router, whose cache of reads it uses (ADR 0038). */
const routed = (screen: () => JSX.Element) => (
  <MemoryRouter>
    <Route path="/" component={screen} />
  </MemoryRouter>
)

describe('OrganizationsProvider', () => {
  it('reads the organizations once for every screen below, and again when asked', async () => {
    const fetch = vi.fn(async () => Response.json([{ id: 'org-1', name: 'Acme', slug: 'acme' }]))

    render(() => (
      <AuthProvider client={createAuthClient({ fetch })}>
        {routed(() => (
          <OrganizationsProvider>
            <Names />
            <Names />
          </OrganizationsProvider>
        ))}
      </AuthProvider>
    ))

    expect(await screen.findAllByText('Acme')).toHaveLength(2)
    expect(fetch).toHaveBeenCalledTimes(1)
    screen.getAllByRole('button', { name: 'Again' })[0]?.click()
    await vi.waitFor(() => expect(fetch).toHaveBeenCalledTimes(2))
  })

  it('is only for screens behind the provider', () => {
    expect(() => render(() => <Names />)).toThrow('useOrganizations must be used inside an OrganizationsProvider')
  })

  it('swaps one organization for its changed self, with no new request', async () => {
    const fetch = vi.fn(async () =>
      Response.json([
        { id: 'org-1', name: 'Acme', slug: 'acme' },
        { id: 'org-2', name: 'Globex', slug: 'globex' }
      ])
    )
    function Controls() {
      const { update } = useOrganizations()
      return (
        <button type="button" onClick={() => update({ id: 'org-1', name: 'Acme Inc', slug: 'acme-inc' })}>
          Rename
        </button>
      )
    }

    render(() => (
      <AuthProvider client={createAuthClient({ fetch })}>
        {routed(() => (
          <OrganizationsProvider>
            <Names />
            <Controls />
          </OrganizationsProvider>
        ))}
      </AuthProvider>
    ))
    expect(await screen.findByText('Acme, Globex')).toBeInTheDocument()

    screen.getByRole('button', { name: 'Rename' }).click()
    expect(await screen.findByText('Acme Inc, Globex')).toBeInTheDocument()
    expect(fetch).toHaveBeenCalledTimes(1)
  })

  it('has a reader for screens that may sit outside the provider, which finds nothing there', async () => {
    function Probe() {
      return <p>{useOptionalOrganizations() === undefined ? 'none' : 'some'}</p>
    }

    render(() => <Probe />)
    expect(screen.getByText('none')).toBeInTheDocument()

    render(() => (
      <AuthProvider client={createAuthClient({ fetch: async () => Response.json([]) })}>
        {routed(() => (
          <OrganizationsProvider>
            <Probe />
          </OrganizationsProvider>
        ))}
      </AuthProvider>
    ))
    expect(await screen.findByText('some')).toBeInTheDocument()
  })
})
