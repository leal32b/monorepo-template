import { render, screen } from '@solidjs/testing-library'
import { I18nProvider } from '#shared/config'
import { PageSkeleton } from './page-skeleton'

describe('PageSkeleton', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('holds the place of a screen, drawing its title and content as skeletons only after a moment', () => {
    render(() => (
      <I18nProvider locale="en">
        <PageSkeleton />
      </I18nProvider>
    ))
    const main = screen.getByRole('main')
    expect(main.children).toHaveLength(0)

    vi.advanceTimersByTime(300)

    expect(main.firstElementChild).toHaveClass('h-8', 'w-48')
    expect(screen.getByRole('status')).toHaveTextContent('Loading…')
  })
})
