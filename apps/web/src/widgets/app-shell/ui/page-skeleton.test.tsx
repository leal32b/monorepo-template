import { createMemoryHistory, MemoryRouter, Route } from '@solidjs/router'
import { render, screen } from '@solidjs/testing-library'
import { I18nProvider } from '#shared/config'
import { PageSkeleton } from './page-skeleton'

function renderSkeleton(path = '/acme') {
  const history = createMemoryHistory()
  history.set({ value: path })
  render(() => (
    <I18nProvider locale="en">
      <MemoryRouter history={history}>
        <Route path="*" component={() => <PageSkeleton />} />
      </MemoryRouter>
    </I18nProvider>
  ))
}

describe('PageSkeleton', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('holds the place of a screen, drawing its title and content as skeletons only after a moment', () => {
    renderSkeleton()
    const main = screen.getByRole('main')
    expect(main.children).toHaveLength(0)

    vi.advanceTimersByTime(300)

    expect(main.firstElementChild?.lastElementChild).toHaveClass('h-8', 'w-48')
    expect(main.firstElementChild?.children).toHaveLength(1)
    expect(screen.getByRole('status')).toHaveTextContent('Loading…')
  })

  it('holds on phones the place of a setting’s way back to its list, so the title does not move (ADR 0080)', () => {
    renderSkeleton('/acme/settings/members')

    vi.advanceTimersByTime(300)

    const header = screen.getByRole('main').firstElementChild as HTMLElement
    expect(header.firstElementChild).toHaveClass('h-9', 'md:hidden')
    expect(header.lastElementChild).toHaveClass('h-8', 'w-48')
  })
})
