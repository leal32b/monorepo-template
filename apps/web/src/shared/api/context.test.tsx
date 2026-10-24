import { render } from '@solidjs/testing-library'
import { createApiClient } from './client'
import { ApiProvider, useApi } from './context'

const client = createApiClient({ fetch: async () => new Response() })

describe('useApi', () => {
  it('gives components the client of the nearest ApiProvider', () => {
    let received: unknown
    const Probe = () => {
      received = useApi()
      return null
    }

    render(() => (
      <ApiProvider client={client}>
        <Probe />
      </ApiProvider>
    ))

    expect(received).toBe(client)
  })

  it('fails loudly outside a provider', () => {
    const Probe = () => {
      useApi()
      return null
    }

    expect(() => render(() => <Probe />)).toThrow('useApi must be used inside an ApiProvider')
  })
})
