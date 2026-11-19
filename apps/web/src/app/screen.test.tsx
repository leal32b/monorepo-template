import { fireEvent, render, screen } from '@solidjs/testing-library'
import { type JSX, Suspense } from 'solid-js'

/** A fresh copy of the language state each test, so no group has arrived yet (ADR 0071). */
async function fresh() {
  vi.resetModules()
  const config = await import('#shared/config')
  const { WithTexts, screenOf } = await import('./screen')
  const { MemoryRouter, Route } = await import('@solidjs/router')
  await config.loadMessages('en')
  // A screen looks its text up as it draws.
  const Customers = () => <h1>{config.useI18n().t('customers.title')}</h1>
  // `ReadFailure` reads the location, so the screen sits in a route.
  const inRoute = (page: () => JSX.Element) =>
    render(() => (
      <config.I18nProvider locale="en">
        <MemoryRouter>
          <Route path="/" component={page} />
        </MemoryRouter>
      </config.I18nProvider>
    ))
  return { ...config, Customers, WithTexts, screenOf, inRoute }
}

describe('WithTexts (ADR 0071)', () => {
  afterEach(() => vi.restoreAllMocks())

  it('draws the screen at once when its groups are there, with no wait', async () => {
    const { inRoute, Customers, loadGroups, WithTexts } = await fresh()
    await loadGroups(['customers'])
    inRoute(() => (
      <WithTexts groups={['customers']}>
        <Customers />
      </WithTexts>
    ))

    expect(screen.getByRole('heading', { name: 'Customers' })).toBeInTheDocument()
  })

  it('keeps the wait under its Suspense until the groups arrive, and never draws a key', async () => {
    const { inRoute, Customers, WithTexts } = await fresh()
    const error = vi.spyOn(console, 'error')
    inRoute(() => (
      <Suspense fallback={<p>skeleton</p>}>
        <WithTexts groups={['customers']}>
          <Customers />
        </WithTexts>
      </Suspense>
    ))

    expect(screen.getByText('skeleton')).toBeInTheDocument()
    expect(screen.queryByText('customers.title')).not.toBeInTheDocument()
    expect(await screen.findByRole('heading', { name: 'Customers' })).toBeInTheDocument()
    expect(error).not.toHaveBeenCalled()
  })

  it('says it when the texts cannot be fetched, and fetches again on Try again', async () => {
    vi.doMock('./../shared/config/i18n/dictionaries/customers/en.ts', () => {
      throw new Error('offline')
    })
    const { inRoute, Customers, WithTexts } = await fresh()
    inRoute(() => (
      <Suspense fallback={<p>skeleton</p>}>
        <WithTexts groups={['customers']}>
          <Customers />
        </WithTexts>
      </Suspense>
    ))

    expect(await screen.findByText(/We could not load this screen/)).toBeInTheDocument()
    vi.doUnmock('./../shared/config/i18n/dictionaries/customers/en.ts')
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }))

    expect(await screen.findByRole('heading', { name: 'Customers' })).toBeInTheDocument()
  })
})

describe('screenOf (ADR 0071)', () => {
  it('starts the texts with the route, even for a link only hovered, and the reads with it', async () => {
    const { hasGroups, screenOf } = await fresh()
    const reads = vi.fn()
    const route = screenOf(() => null, ['audit'], reads)
    const args = { intent: 'preload', params: {} } as never

    route.preload(args)

    await vi.waitFor(() => expect(hasGroups(['audit'])).toBe(true))
    expect(reads).toHaveBeenCalledWith(args)
  })

  it('goes without reads, and keeps a failed start for the screen to say', async () => {
    vi.doMock('./../shared/config/i18n/dictionaries/audit/en.ts', () => {
      throw new Error('offline')
    })
    const { screenOf } = await fresh()
    const route = screenOf(() => null, ['audit'])

    expect(() => route.preload({ intent: 'navigate', params: {} } as never)).not.toThrow()
    await new Promise((resolve) => setTimeout(resolve, 10))
    vi.doUnmock('./../shared/config/i18n/dictionaries/audit/en.ts')
  })

  it('leaves a screen with no groups as it is', async () => {
    const { screenOf } = await fresh()
    const Page = () => <p>page</p>

    expect(screenOf(Page, []).component).toBe(Page)
  })
})
