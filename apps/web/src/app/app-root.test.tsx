import { createMemoryHistory, MemoryRouter, Route } from '@solidjs/router'
import { fireEvent, render, screen, waitFor } from '@solidjs/testing-library'
import { createErrorReporter, createRequests, type ErrorReporter } from '#shared/api'
import { I18nProvider } from '#shared/config'
import { AppRoot } from './app-root'

function renderApp(reporter: ErrorReporter, path = '/acme/customers/c-42?search=ana') {
  function Customer(): never {
    throw new TypeError('customer.name is undefined')
  }
  const history = createMemoryHistory()
  history.set({ value: path })
  render(() => (
    <I18nProvider locale="en">
      <MemoryRouter
        history={history}
        root={(root) => (
          <AppRoot requests={createRequests()} reporter={reporter}>
            {root.children}
          </AppRoot>
        )}
      >
        <Route path="/:organizationSlug/customers" component={() => <p>The list</p>} />
        <Route path="/:organizationSlug/customers/:customerId" component={() => <Customer />} />
      </MemoryRouter>
    </I18nProvider>
  ))
}

describe('AppRoot (ADR 0072)', () => {
  afterEach(() => vi.restoreAllMocks())

  it('shows the error screen for a screen that throws, with the reference that was sent and the route pattern, never the address', async () => {
    const sent: unknown[] = []
    const reporter = createErrorReporter({
      send: (report) => sent.push(report),
      release: 'web-3e75fa2',
      reference: () => 'a1b2c3d4e5f6'
    })
    const reload = vi.spyOn(window.location, 'reload').mockImplementation(() => undefined)
    renderApp(reporter)

    expect(await screen.findByRole('heading', { level: 1, name: 'Something went wrong' })).toBeInTheDocument()
    expect(screen.getByRole('alert')).toHaveTextContent('client_error · a1b2c3d4e5f6')
    expect(sent).toEqual([
      expect.objectContaining({
        kind: 'render',
        message: 'customer.name is undefined',
        route: '/:organizationSlug/customers/:customerId',
        release: 'web-3e75fa2',
        reference: 'a1b2c3d4e5f6'
      })
    ])
    expect(JSON.stringify(sent)).not.toMatch(/c-42|search|ana/)
    fireEvent.click(screen.getByRole('button', { name: 'Reload the page' }))
    expect(reload).toHaveBeenCalledOnce()
  })

  it('draws a screen that does not throw as it is', async () => {
    const sent: unknown[] = []
    renderApp(createErrorReporter({ send: (report) => sent.push(report), release: 'dev' }), '/acme/customers')

    expect(await screen.findByText('The list')).toBeInTheDocument()
    expect(sent).toEqual([])
  })

  it('names the start route when no route matched', async () => {
    const reporter = { report: vi.fn(), setRoute: vi.fn() }
    renderApp(reporter, '/nowhere')

    await waitFor(() => expect(reporter.setRoute).toHaveBeenLastCalledWith('/'))
  })
})
