import { render, screen } from '@solidjs/testing-library'
import { I18nProvider } from '#shared/config'
import { ShellSkeleton } from './shell-skeleton'

function renderSkeleton() {
  return render(() => (
    <I18nProvider locale="en">
      <ShellSkeleton />
    </I18nProvider>
  ))
}

describe('ShellSkeleton', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('shows nothing at first, so a quick check draws nothing at all', () => {
    const { container } = renderSkeleton()

    expect(container).toBeEmptyDOMElement()
  })

  it('draws the empty frame of the shell after a moment, busy, with the wait said to screen readers', () => {
    const { container } = renderSkeleton()

    vi.advanceTimersByTime(300)

    expect(container.querySelector('[aria-busy="true"]')).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent('Loading…')
    expect(container.querySelector('aside')).toHaveClass('hidden', 'md:block')
    expect(container.querySelector('header')).toHaveClass('h-14', 'border-b')
  })

  it('stops waiting when it goes away before the moment is over', () => {
    const { container, unmount } = renderSkeleton()

    unmount()
    vi.advanceTimersByTime(300)

    expect(container).toBeEmptyDOMElement()
  })
})
