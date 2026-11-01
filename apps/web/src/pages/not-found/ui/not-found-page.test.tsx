import { MemoryRouter, Route } from '@solidjs/router'
import { render, screen } from '@solidjs/testing-library'
import { ApiProvider, createApiClient } from '#shared/api'
import { I18nProvider } from '#shared/config'
import { NotFoundPage } from './not-found-page'

const health = { status: 'ok', service: 'api', timestamp: '2026-10-17T12:00:00.000Z', database: 'up' }

describe('NotFoundPage', () => {
  it('says the page is not there, with the way back to the start', () => {
    render(() => (
      <I18nProvider locale="en">
        <ApiProvider client={createApiClient({ fetch: async () => Response.json(health) })}>
          <MemoryRouter>
            <Route path="*" component={NotFoundPage} />
          </MemoryRouter>
        </ApiProvider>
      </I18nProvider>
    ))

    expect(screen.getByRole('heading', { level: 1, name: 'Page not found' })).toHaveFocus()
    expect(screen.getByText('The address may be wrong, or the page may have moved.')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Go to the start' })).toHaveAttribute('href', '/')
  })
})
