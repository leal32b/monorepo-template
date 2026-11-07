import { motion } from '@repo/ui'
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

  it('draws the frame of the shell after a moment, busy, with the wait said to screen readers', () => {
    const { container } = renderSkeleton()

    vi.advanceTimersByTime(motion.waitDelay)

    expect(container.querySelector('[aria-busy="true"]')).toBeInTheDocument()
    expect(screen.getAllByRole('status')[0]).toHaveTextContent('Loading…')
    expect(container.querySelector('aside')).toHaveClass('hidden', 'md:block')
    expect(container.querySelector('header')).toHaveClass('h-14', 'border-b')
  })

  it('fills the frame with the places of the menu and of the page, so it reads as loading, not as broken', () => {
    const { container } = renderSkeleton()

    vi.advanceTimersByTime(motion.waitDelay)

    expect(container.querySelectorAll('aside .bg-secondary')).toHaveLength(4)
    expect(container.querySelector('main [aria-busy="true"]')).toBeInTheDocument()
  })

  it('says nothing about the wait while it is short', () => {
    renderSkeleton()

    vi.advanceTimersByTime(motion.slowWaitDelay - 1)

    expect(screen.queryByText(/taking longer than usual/)).not.toBeInTheDocument()
  })

  it('says why and for how long once the wait is long: the server may be waking up', () => {
    renderSkeleton()

    vi.advanceTimersByTime(motion.slowWaitDelay)

    expect(screen.getByText(/taking longer than usual/)).toHaveTextContent('up to a minute')
  })

  it('stops waiting when it goes away before the moment is over', () => {
    const { container, unmount } = renderSkeleton()

    unmount()
    vi.advanceTimersByTime(motion.slowWaitDelay)

    expect(container).toBeEmptyDOMElement()
  })
})
