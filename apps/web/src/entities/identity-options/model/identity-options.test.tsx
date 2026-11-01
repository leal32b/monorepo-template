import { render, screen, waitFor } from '@solidjs/testing-library'
import { ApiProvider, createApiClient } from '#shared/api'
import { IdentityOptionsProvider, useIdentityOptions } from './identity-options'

const Probe = () => {
  const options = useIdentityOptions()
  return <p>{options() === undefined ? 'unknown' : options()?.google ? 'google on' : 'google off'}</p>
}

function renderProbe(fetch: () => Promise<Response>, given?: { google: boolean }) {
  render(() => (
    <ApiProvider client={createApiClient({ fetch })}>
      <IdentityOptionsProvider options={given}>
        <Probe />
      </IdentityOptionsProvider>
    </ApiProvider>
  ))
}

describe('useIdentityOptions', () => {
  it('knows at once what the app asked for at start-up, and does not ask again', () => {
    const fetch = vi.fn(async () => Response.json({ google: false }))

    renderProbe(fetch, { google: true })

    expect(screen.getByText('google on')).toBeInTheDocument()
    expect(fetch).not.toHaveBeenCalled()
  })

  it('asks for itself when the app did not, unknown until the API answers', async () => {
    renderProbe(async () => Response.json({ google: true }))

    expect(screen.getByText('unknown')).toBeInTheDocument()
    expect(await screen.findByText('google on')).toBeInTheDocument()
  })

  it('counts a failed answer as off, so a screen never waits on it for good', async () => {
    renderProbe(async () => {
      throw new TypeError('Failed to fetch')
    })

    await waitFor(() => expect(screen.getByText('google off')).toBeInTheDocument())
  })
})
