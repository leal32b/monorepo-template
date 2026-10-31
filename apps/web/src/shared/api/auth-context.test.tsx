import { render } from '@solidjs/testing-library'
import { createAuthClient } from './auth-client'
import { AuthProvider, useAuth } from './auth-context'

describe('useAuth', () => {
  it('gives components the client of the nearest AuthProvider', () => {
    const client = createAuthClient({ fetch: async () => Response.json(null) })
    let received: unknown
    const Probe = () => {
      received = useAuth()
      return null
    }

    render(() => (
      <AuthProvider client={client}>
        <Probe />
      </AuthProvider>
    ))

    expect(received).toBe(client)
  })

  it('fails loudly outside a provider', () => {
    const Probe = () => {
      useAuth()
      return null
    }

    expect(() => render(() => <Probe />)).toThrow('useAuth must be used inside an AuthProvider')
  })
})
