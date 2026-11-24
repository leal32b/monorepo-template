import { motion } from '@repo/ui'
import { MemoryRouter, Route } from '@solidjs/router'
import { render, screen } from '@solidjs/testing-library'
import { I18nProvider } from '#shared/config'
import { ShellSkeleton } from './shell-skeleton'

function renderSkeleton() {
  return render(() => (
    <I18nProvider locale="en">
      {/* As in the app, where a route's guard draws it. */}
      <MemoryRouter>
        <Route path="*" component={ShellSkeleton} />
      </MemoryRouter>
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
    expect(container.querySelector('aside')).toHaveClass('hidden', 'md:flex')
  })

  it('draws the places of the frame where they will be (ADR 0080): the side menu from md, the top row and the tab bar below', () => {
    const { container } = renderSkeleton()

    vi.advanceTimersByTime(motion.waitDelay)

    const aside = container.querySelector('aside') as HTMLElement
    // The organization's mark, square, at the top; the person's, round, at the foot.
    expect(aside.firstElementChild).toHaveClass('h-14')
    expect(aside.firstElementChild?.querySelector('.rounded-md.size-8')).toBeInTheDocument()
    expect(aside.lastElementChild).toHaveClass('border-t')
    expect(aside.lastElementChild?.querySelector('.rounded-full.size-8')).toBeInTheDocument()
    const top = container.querySelector('header') as HTMLElement
    expect(top).toHaveClass('h-14', 'border-b', 'md:hidden')
    expect(top.querySelector('.rounded-md.size-8')).toBeInTheDocument()
    const tabs = container.querySelector('.fixed.bottom-0') as HTMLElement
    expect(tabs).toHaveClass('h-[calc(4rem+env(safe-area-inset-bottom))]', 'md:hidden')
    expect(tabs.querySelectorAll('.size-6')).toHaveLength(4)
  })

  it('fills the frame with the places of the menu and of the page, so it reads as loading, not as broken', () => {
    const { container } = renderSkeleton()

    vi.advanceTimersByTime(motion.waitDelay)

    expect(container.querySelectorAll('aside nav .bg-secondary')).toHaveLength(4)
    expect(container.querySelector('main [aria-busy="true"]')).toBeInTheDocument()
    expect(container.querySelector('main')?.parentElement?.parentElement).toHaveClass(
      'pb-[calc(4rem+env(safe-area-inset-bottom))]'
    )
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
