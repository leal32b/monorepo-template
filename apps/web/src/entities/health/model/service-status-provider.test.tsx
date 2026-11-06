import { render, screen, waitFor } from '@solidjs/testing-library'
import { createSignal, Show } from 'solid-js'
import { ApiProvider, createApiClient } from '#shared/api'
import { ServiceStatusProvider, useServiceStatus } from './service-status-provider'

const health = { status: 'ok', service: 'api', timestamp: '2026-10-17T12:00:00.000Z', database: 'up' }

type Fetch = () => Promise<Response>

/** A screen that shows the service status, as the entry screens' notice and the frame do. */
function Shows(props: { name: string }) {
  const status = useServiceStatus()
  return <p data-testid={props.name}>{status.state()}</p>
}

/** One screen of the app, then the next one in its place; returns what opens the next. */
function renderScreens(fetch: Fetch) {
  const [next, setNext] = createSignal(false)
  render(() => (
    <ApiProvider client={createApiClient({ fetch })}>
      <ServiceStatusProvider>
        <Show when={next()} fallback={<Shows name="first" />}>
          <Shows name="next" />
        </Show>
      </ServiceStatusProvider>
    </ApiProvider>
  ))
  return () => setNext(true)
}

describe('useServiceStatus', () => {
  it('asks the API once for every screen of the app that shows it (W09)', async () => {
    const fetch = vi.fn<Fetch>(async () => Response.json(health))
    const openNext = renderScreens(fetch)
    await waitFor(() => expect(screen.getByTestId('first')).toHaveTextContent('ok'))

    openNext()

    expect(screen.getByTestId('next')).toHaveTextContent('ok')
    expect(fetch).toHaveBeenCalledTimes(1)
  })

  it('asks nothing before a screen shows it', () => {
    const fetch = vi.fn<Fetch>(async () => Response.json(health))

    render(() => (
      <ApiProvider client={createApiClient({ fetch })}>
        <ServiceStatusProvider>
          <p>Nothing about the service</p>
        </ServiceStatusProvider>
      </ApiProvider>
    ))

    expect(fetch).not.toHaveBeenCalled()
  })

  it('asks again as the next screen opens after a problem, so a notice does not outlive it', async () => {
    const fetch = vi
      .fn<Fetch>()
      .mockRejectedValueOnce(new TypeError('Failed to fetch'))
      .mockResolvedValueOnce(Response.json(health))
    const openNext = renderScreens(fetch)
    await waitFor(() => expect(screen.getByTestId('first')).toHaveTextContent('unreachable'))

    openNext()

    await waitFor(() => expect(screen.getByTestId('next')).toHaveTextContent('ok'))
    expect(fetch).toHaveBeenCalledTimes(2)
  })

  it('reads its own for a screen drawn outside the app, as in a test of that screen', async () => {
    const fetch = vi.fn<Fetch>(async () => Response.json(health))

    render(() => (
      <ApiProvider client={createApiClient({ fetch })}>
        <Shows name="alone" />
      </ApiProvider>
    ))

    await waitFor(() => expect(screen.getByTestId('alone')).toHaveTextContent('ok'))
    expect(fetch).toHaveBeenCalledTimes(1)
  })
})
