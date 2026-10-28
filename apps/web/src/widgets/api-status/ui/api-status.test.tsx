import { render, screen } from '@solidjs/testing-library'
import { ApiProvider, createApiClient } from '#shared/api'
import { I18nProvider, type Locale } from '#shared/config'
import { ApiStatus } from './api-status'

const health = { status: 'ok', service: 'api', timestamp: '2026-10-17T12:00:00.000Z', database: 'up' }

function renderWith(fetch: () => Promise<Response>, locale: Locale = 'en') {
  render(() => (
    <I18nProvider locale={locale}>
      <ApiProvider client={createApiClient({ fetch })}>
        <ApiStatus />
      </ApiProvider>
    </I18nProvider>
  ))
}

describe('ApiStatus', () => {
  it('shows a status while the API is being checked', () => {
    renderWith(() => new Promise<Response>(() => {}))

    expect(screen.getByRole('status')).toHaveTextContent('Checking the API')
  })

  it('shows the service and the time once the API answers ok', async () => {
    renderWith(async () => Response.json(health))

    const status = await screen.findByText(/API is up/)
    expect(status).toHaveTextContent('api')
    expect(status).toHaveTextContent('2026-10-17T12:00:00.000Z')
  })

  it('tells that the API cannot be reached', async () => {
    renderWith(async () => {
      throw new TypeError('Failed to fetch')
    })

    expect(await screen.findByRole('alert')).toHaveTextContent('Cannot reach the API')
  })

  it('shows the problem code when the API answers an error', async () => {
    const problem = { type: 'urn:problem:boom', title: 'Boom', status: 500, code: 'internal_error' }
    renderWith(async () => Response.json(problem, { status: 500 }))

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('The API answered an error')
    expect(alert).toHaveTextContent('internal_error')
  })

  it('shows a generic error when the error answer is not a problem', async () => {
    renderWith(async () => new Response('Bad gateway', { status: 502 }))

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('The API answered an error')
    expect(alert).not.toHaveTextContent('internal_error')
  })

  it('warns when the answer does not satisfy the contract', async () => {
    renderWith(async () => Response.json({ status: 'down' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('The API answered something unexpected')
  })

  it('falls back to a generic message for a failure it does not know', async () => {
    renderWith(async () => ({}) as Response)

    expect(await screen.findByRole('alert')).toHaveTextContent('Something went wrong')
  })

  it('speaks the language of the provider', async () => {
    renderWith(async () => Response.json(health), 'pt-BR')

    expect(await screen.findByText(/A API está no ar/)).toBeInTheDocument()
  })

  it('tells that the database is down when the API answers degraded', async () => {
    renderWith(async () => Response.json({ ...health, status: 'degraded', database: 'down' }, { status: 503 }))

    expect(await screen.findByRole('alert')).toHaveTextContent('The API is up, but its database is not answering')
  })

  it('checks again when asked, but not while a check is running', async () => {
    const fetch = vi
      .fn<() => Promise<Response>>()
      .mockRejectedValueOnce(new TypeError('Failed to fetch'))
      .mockResolvedValueOnce(Response.json(health))
    renderWith(fetch)
    const button = screen.getByRole('button', { name: 'Check again' })

    expect(button).toBeDisabled()
    expect(await screen.findByRole('alert')).toHaveTextContent('Cannot reach the API')
    expect(button).toBeEnabled()

    button.click()

    expect(await screen.findByText(/API is up/)).toBeInTheDocument()
    expect(fetch).toHaveBeenCalledTimes(2)
  })
})
