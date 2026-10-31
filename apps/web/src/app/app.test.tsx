import { render, screen } from '@solidjs/testing-library'
import { createApiClient, createAuthClient } from '#shared/api'
import { App } from './app'

describe('App', () => {
  afterEach(() => window.history.replaceState(null, '', '/'))

  it('serves the home page at the root route, in the given language, with the given clients', async () => {
    const health = { status: 'ok', service: 'api', timestamp: '2026-10-17T12:00:00.000Z', database: 'up' }
    const client = createApiClient({ fetch: async () => Response.json(health) })
    const auth = createAuthClient({ fetch: async () => Response.json(null) })

    render(() => <App client={client} auth={auth} locale="en" />)

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Monorepo template')
    expect(await screen.findByText(/The API is up/)).toBeInTheDocument()
  })

  it('serves the sign-up page at /signup', () => {
    const client = createApiClient({ fetch: async () => Response.json(null) })
    const auth = createAuthClient({ fetch: async () => Response.json(null) })
    window.history.replaceState(null, '', '/signup')

    render(() => <App client={client} auth={auth} locale="en" />)

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Create your account')
  })

  it('serves the sign-in page at /login', () => {
    const client = createApiClient({ fetch: async () => Response.json(null) })
    const auth = createAuthClient({ fetch: async () => Response.json(null) })
    window.history.replaceState(null, '', '/login')

    render(() => <App client={client} auth={auth} locale="en" />)

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Sign in')
  })

  it('serves the second step of the sign-in at /login/two-factor', () => {
    const client = createApiClient({ fetch: async () => Response.json(null) })
    const auth = createAuthClient({ fetch: async () => Response.json(null) })
    window.history.replaceState(null, '', '/login/two-factor')

    render(() => <App client={client} auth={auth} locale="en" />)

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Two-step verification')
  })

  it('serves the request for a new password at /forgot-password', () => {
    const client = createApiClient({ fetch: async () => Response.json(null) })
    const auth = createAuthClient({ fetch: async () => Response.json(null) })
    window.history.replaceState(null, '', '/forgot-password')

    render(() => <App client={client} auth={auth} locale="en" />)

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Reset your password')
  })

  it('serves the choice of a new password at /reset-password', () => {
    const client = createApiClient({ fetch: async () => Response.json(null) })
    const auth = createAuthClient({ fetch: async () => Response.json(null) })
    window.history.replaceState(null, '', '/reset-password?token=t0k3n')

    render(() => <App client={client} auth={auth} locale="en" />)

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Choose a new password')
  })
})
