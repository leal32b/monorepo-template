import { render } from '@solidjs/testing-library'
import { SessionProvider, useSession } from './session'

const ada = { id: 'u1', email: 'ada@example.com', name: 'Ada Lovelace' }

describe('useSession', () => {
  it('gives the components below a SessionProvider the user who is signed in', () => {
    let received: unknown
    const Probe = () => {
      received = useSession()
      return null
    }

    render(() => (
      <SessionProvider user={ada}>
        <Probe />
      </SessionProvider>
    ))

    expect(received).toEqual(ada)
  })

  it('fails loudly outside a provider', () => {
    const Probe = () => {
      useSession()
      return null
    }

    expect(() => render(() => <Probe />)).toThrow('useSession must be used inside a SessionProvider')
  })
})
