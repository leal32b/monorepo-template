import { render, screen } from '@solidjs/testing-library'
import { Show } from 'solid-js'
import { AuthProvider, createAuthClient } from '#shared/api'
import { OrganizationsProvider, useOrganizations } from './organizations'

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

describe('OrganizationsProvider', () => {
  it('reads the organizations once for every screen below, and again when asked', async () => {
    const fetch = vi.fn(async () => Response.json([{ id: 'org-1', name: 'Acme', slug: 'acme' }]))

    render(() => (
      <AuthProvider client={createAuthClient({ fetch })}>
        <OrganizationsProvider>
          <Names />
          <Names />
        </OrganizationsProvider>
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
})
