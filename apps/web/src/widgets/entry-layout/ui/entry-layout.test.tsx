import { MemoryRouter, Route } from '@solidjs/router'
import { fireEvent, render, screen, waitFor } from '@solidjs/testing-library'
import type { JSX } from 'solid-js'
import { ApiProvider, createApiClient } from '#shared/api'
import { I18nProvider, loadMessages } from '#shared/config'
import { EntryLayout } from './entry-layout'

const health = { status: 'ok', service: 'api', timestamp: '2026-10-17T12:00:00.000Z', database: 'up' }

/** True when `later` comes after `earlier` in the document, as it is read and laid out. */
const follows = (earlier: Element, later: Element) =>
  Boolean(earlier.compareDocumentPosition(later) & Node.DOCUMENT_POSITION_FOLLOWING)

/** An entry screen in a router, as the app renders it. */
function renderScreen(
  screenInRouter: () => JSX.Element,
  api: () => Promise<Response> = async () => Response.json(health)
) {
  render(() => (
    <I18nProvider locale="en">
      <ApiProvider client={createApiClient({ fetch: api })}>
        <MemoryRouter>
          <Route path="*" component={screenInRouter} />
        </MemoryRouter>
      </ApiProvider>
    </I18nProvider>
  ))
}

const renderSignIn = () =>
  renderScreen(() => (
    <EntryLayout title="Sign in" description="Welcome back." footer={<a href="/signup">Create an account</a>}>
      <form aria-label="Sign-in form" />
    </EntryLayout>
  ))

describe('EntryLayout', () => {
  it('frames an entry screen: brand, heading, description, content and footer, in that order', () => {
    renderSignIn()
    const brand = screen.getByRole('link', { name: 'Monorepo Template' })
    const heading = screen.getByRole('heading', { level: 1, name: 'Sign in' })
    const form = screen.getByRole('form', { name: 'Sign-in form' })
    const footer = screen.getByRole('link', { name: 'Create an account' })

    expect(screen.getAllByRole('heading')).toHaveLength(1)
    expect(screen.getByText('Welcome back.')).toBeInTheDocument()
    expect([follows(brand, heading), follows(heading, form), follows(form, footer)]).toEqual([true, true, true])
  })

  it('leaves out the description and the footer when a screen has none', () => {
    renderScreen(() => (
      <EntryLayout title="Two-step verification">
        <form aria-label="Code form" />
      </EntryLayout>
    ))

    // The brand, the heading and the form: nothing empty takes room between them.
    expect(screen.getByRole('main').children).toHaveLength(3)
  })

  it('links the brand to the home page', () => {
    renderSignIn()

    expect(screen.getByRole('link', { name: 'Monorepo Template' })).toHaveAttribute('href', '/')
  })

  it('moves focus to the heading when the screen opens, as after a route change', () => {
    renderSignIn()

    expect(screen.getByRole('heading', { level: 1 })).toHaveFocus()
  })

  it('keeps every entry screen in the same narrow column, top-aligned, mobile first', () => {
    renderSignIn()

    expect(screen.getByRole('main')).toHaveClass('max-w-sm', 'px-4', 'py-8', 'sm:px-6', 'sm:py-12')
  })

  describe('the service notice', () => {
    const withApi = (api: () => Promise<Response>) =>
      renderScreen(
        () => (
          <EntryLayout title="Sign in" footer={<a href="/signup">Create an account</a>}>
            <form aria-label="Sign-in form" />
          </EntryLayout>
        ),
        api
      )

    it('says nothing while the service is well', async () => {
      withApi(async () => Response.json(health))
      await waitFor(() => expect(screen.getByRole('main')).toBeInTheDocument())

      expect(screen.queryByRole('status')).not.toBeInTheDocument()
    })

    it('says, below the form and before the footer, that the service is having trouble', async () => {
      withApi(async () => Response.json({ ...health, status: 'degraded', database: 'down' }, { status: 503 }))

      const notice = await screen.findByRole('status')

      expect(notice).toHaveTextContent('The service is having trouble')
      expect(notice).toHaveTextContent('Some features are not working. Signing in or creating an account may not work.')
      expect(follows(screen.getByRole('form', { name: 'Sign-in form' }), notice)).toBe(true)
      expect(follows(notice, screen.getByRole('link', { name: 'Create an account' }))).toBe(true)
    })

    it('says when the service cannot be reached', async () => {
      withApi(async () => {
        throw new TypeError('Failed to fetch')
      })

      expect(await screen.findByRole('status')).toHaveTextContent('Cannot reach the service')
    })
  })

  describe('the language', () => {
    afterEach(() => localStorage.clear())

    it('can be changed in the footer, applied at once and kept on the device', async () => {
      await loadMessages('pt-BR')
      renderSignIn()
      const picker = screen.getByRole('combobox', { name: 'Language' })
      expect(picker).toHaveValue('en')

      fireEvent.change(picker, { target: { value: 'pt-BR' } })

      expect(await screen.findByRole('combobox', { name: 'Idioma' })).toHaveValue('pt-BR')
      expect(localStorage.getItem('locale')).toBe('pt-BR')
    })

    it('sits in a footer of its own, in the same column', () => {
      renderSignIn()

      const footer = screen.getByRole('contentinfo')
      expect(footer).toContainElement(screen.getByRole('combobox', { name: 'Language' }))
      expect(footer).toHaveClass('max-w-sm', 'px-4', 'sm:px-6')
    })
  })
})
