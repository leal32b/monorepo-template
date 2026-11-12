import { motion } from '@repo/ui'
import { createMemoryHistory, MemoryRouter, Route } from '@solidjs/router'
import { fireEvent, render, screen } from '@solidjs/testing-library'
import { publicOrganizationQuery } from '#entities/public-organizations'
import { ApiProvider, createApiClient } from '#shared/api'
import { I18nProvider } from '#shared/config'
import { PublicOrganizationPage } from './public-organization-page'

type Fetch = (input: string, init?: RequestInit) => Promise<Response>

const organization = (slug: string, name = 'Acme Barbershop') => ({ name, slug, timeZone: 'UTC', currency: 'USD' })
const problem = (status: number, code: string, more: Record<string, unknown> = {}) =>
  Response.json({ type: `urn:problem:${code}`, title: code, status, code, ...more }, { status })

function renderPage(fetch: Fetch, slug: string) {
  const history = createMemoryHistory()
  history.set({ value: `/p/${slug}` })
  render(() => (
    <I18nProvider locale="en">
      <ApiProvider client={createApiClient({ fetch })}>
        <MemoryRouter history={history}>
          <Route path="/p/:orgSlug" component={PublicOrganizationPage} />
        </MemoryRouter>
      </ApiProvider>
    </I18nProvider>
  ))
}

const heading = (name: string) => screen.findByRole('heading', { level: 1, name })

describe('PublicOrganizationPage', () => {
  it('names the organization in the frame, with the form to become its customer', async () => {
    renderPage(async () => Response.json(organization('acme')), 'acme')

    expect(await heading('Become a customer')).toHaveFocus()
    expect(screen.getByText('Acme Barbershop')).toBeInTheDocument()
    expect(screen.getByText('Leave your name and a way to reach you.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Send my details' })).toBeInTheDocument()
    expect(screen.getByRole('combobox', { name: 'Language' })).toBeInTheDocument()
  })

  it('draws at once an organization read a moment ago, as when its route started the read (ADR 0038)', async () => {
    await publicOrganizationQuery(createApiClient({ fetch: async () => Response.json(organization('drawn')) }))('drawn')

    renderPage(() => new Promise<Response>(() => undefined), 'drawn')

    expect(screen.getByRole('heading', { level: 1, name: 'Become a customer' })).toBeInTheDocument()
  })

  it('says there is no page at an address no organization has, with nothing of the app to sign in to', async () => {
    renderPage(async () => problem(404, 'organization_not_found'), 'nowhere')

    expect(await heading('There is no page at this address')).toBeInTheDocument()
    expect(screen.getByText(/Check the link with whoever gave it to you/)).toBeInTheDocument()
    expect(screen.getByText('Monorepo Template')).not.toHaveAttribute('href')
    expect(screen.queryByRole('link')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Try again' })).not.toBeInTheDocument()
  })

  it('says how long to wait when the read was refused for too many requests, and reads again on demand', async () => {
    const fetch = vi
      .fn<Fetch>()
      .mockResolvedValueOnce(problem(429, 'rate_limited', { retryAfter: 30 }))
      .mockResolvedValue(Response.json(organization('busy')))
    renderPage(fetch, 'busy')

    expect(await screen.findByRole('alert')).toHaveTextContent('Try again in 30 seconds.')
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }))

    expect(await heading('Become a customer')).toBeInTheDocument()
  })

  it('says the page could not be opened when the server is out of reach, with the way to try again', async () => {
    renderPage(() => Promise.reject(new TypeError('offline')), 'offline')

    expect(await heading('This page could not be opened')).toBeInTheDocument()
    expect(screen.getByRole('alert')).toHaveTextContent('We could not reach the server.')
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument()
  })

  describe('a slow read', () => {
    beforeEach(() => vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'Date'] }))
    afterEach(() => vi.useRealTimers())

    it('holds the frame with a place for the name, and says why after a while (ADR 0041)', () => {
      renderPage(() => new Promise<Response>(() => undefined), 'slow')

      vi.advanceTimersByTime(motion.slowWaitDelay)

      expect(screen.getByRole('main')).toHaveAttribute('aria-busy', 'true')
      expect(screen.queryByText('Monorepo Template')).not.toBeInTheDocument()
      expect(screen.getByText(/taking longer than usual/)).toBeInTheDocument()
    })
  })

  it('wraps a long organization name instead of widening the page', async () => {
    const long = 'The Very Long Name of a Barbershop That Cuts Hair and Trims Beards on the Corner'
    renderPage(async () => Response.json(organization('long', long)), 'long')

    await heading('Become a customer')
    expect(screen.getByText(long)).toHaveClass('break-words')
  })
})
