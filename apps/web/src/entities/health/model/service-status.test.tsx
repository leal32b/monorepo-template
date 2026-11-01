import { render, screen, waitFor } from '@solidjs/testing-library'
import { ApiProvider, createApiClient } from '#shared/api'
import { createServiceStatus } from './service-status'

const health = { status: 'ok', service: 'api', timestamp: '2026-10-17T12:00:00.000Z', database: 'up' }

type Fetch = () => Promise<Response>

function Probe() {
  const status = createServiceStatus()
  return (
    <>
      <p data-testid="state">{status.state()}</p>
      <p data-testid="checked-at">{status.checkedAt() ?? '-'}</p>
      <p data-testid="reference">{status.reference() ?? '-'}</p>
      <button type="button" onClick={status.check}>
        check
      </button>
    </>
  )
}

function renderProbe(fetch: Fetch) {
  render(() => (
    <ApiProvider client={createApiClient({ fetch })}>
      <Probe />
    </ApiProvider>
  ))
}

const state = () => screen.getByTestId('state').textContent

describe('createServiceStatus', () => {
  it('is checking until the API answers', () => {
    renderProbe(() => new Promise<Response>(() => {}))

    expect(state()).toBe('checking')
    expect(screen.getByTestId('checked-at')).toHaveTextContent('-')
  })

  it('is ok when the API and its database answer, with the time of the answer', async () => {
    renderProbe(async () => Response.json(health))

    await waitFor(() => expect(state()).toBe('ok'))
    expect(screen.getByTestId('checked-at')).toHaveTextContent(health.timestamp)
    expect(screen.getByTestId('reference')).toHaveTextContent('-')
  })

  it('is degraded when the API answers 503 because its database is down', async () => {
    renderProbe(async () => Response.json({ ...health, status: 'degraded', database: 'down' }, { status: 503 }))

    await waitFor(() => expect(state()).toBe('degraded'))
  })

  it('is unreachable when the API cannot be reached', async () => {
    renderProbe(async () => {
      throw new TypeError('Failed to fetch')
    })

    await waitFor(() => expect(state()).toBe('unreachable'))
    expect(screen.getByTestId('checked-at')).toHaveTextContent('-')
  })

  it('is unexpected when the answer breaks the contract', async () => {
    renderProbe(async () => Response.json({ status: 'down' }))

    await waitFor(() => expect(state()).toBe('unexpected'))
  })

  it('is unexpected for a failure it does not know', async () => {
    renderProbe(async () => ({}) as Response)

    await waitFor(() => expect(state()).toBe('unexpected'))
  })

  it('is error when the API answers an error, with the code and request id to quote', async () => {
    const problem = {
      type: 'urn:problem:boom',
      title: 'Boom',
      status: 500,
      code: 'internal_error',
      requestId: '6f1c2a'
    }
    renderProbe(async () => Response.json(problem, { status: 500 }))

    await waitFor(() => expect(state()).toBe('error'))
    expect(screen.getByTestId('reference')).toHaveTextContent('internal_error · 6f1c2a')
  })

  it('has no reference when the error answer is not a problem', async () => {
    renderProbe(async () => new Response('Bad gateway', { status: 502 }))

    await waitFor(() => expect(state()).toBe('error'))
    expect(screen.getByTestId('reference')).toHaveTextContent('-')
  })

  it('checks again when asked', async () => {
    const fetch = vi
      .fn<Fetch>()
      .mockRejectedValueOnce(new TypeError('Failed to fetch'))
      .mockResolvedValueOnce(Response.json(health))
    renderProbe(fetch)
    await waitFor(() => expect(state()).toBe('unreachable'))

    screen.getByRole('button', { name: 'check' }).click()

    await waitFor(() => expect(state()).toBe('ok'))
    expect(fetch).toHaveBeenCalledTimes(2)
  })
})
