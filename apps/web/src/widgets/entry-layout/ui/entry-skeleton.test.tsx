import { motion } from '@repo/ui'
import { render, screen } from '@solidjs/testing-library'
import { I18nProvider } from '#shared/config'
import { EntrySkeleton } from './entry-skeleton'

function renderSkeleton(brand?: 'app' | 'pending') {
  return render(() => (
    <I18nProvider locale="en">
      <EntrySkeleton brand={brand} />
    </I18nProvider>
  ))
}

describe('EntrySkeleton', () => {
  beforeEach(() => vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'Date'] }))
  afterEach(() => vi.useRealTimers())

  it('shows nothing for a quick load, then the frame of an entry screen after a moment', () => {
    renderSkeleton()
    expect(screen.queryByRole('status')).not.toBeInTheDocument()

    vi.advanceTimersByTime(motion.waitDelay)

    expect(screen.getByRole('status')).toHaveTextContent('Loading…')
    expect(screen.getByRole('main')).toHaveAttribute('aria-busy', 'true')
    expect(screen.getByText('Monorepo Template')).toBeInTheDocument()
  })

  it('holds the place of a name still to come, for a page whose brand is not the app (ADR 0060)', () => {
    const { container } = renderSkeleton('pending')

    vi.advanceTimersByTime(motion.waitDelay)

    expect(screen.queryByText('Monorepo Template')).not.toBeInTheDocument()
    expect(container.querySelectorAll('main > [aria-hidden="true"]')).toHaveLength(3)
  })

  it('says why once the wait is long: the server may be waking up (ADR 0041)', () => {
    renderSkeleton()

    vi.advanceTimersByTime(motion.slowWaitDelay - 1)
    expect(screen.queryByText(/taking longer than usual/)).not.toBeInTheDocument()

    vi.advanceTimersByTime(1)
    expect(screen.getByText(/taking longer than usual/)).toHaveTextContent('up to a minute')
  })
})
