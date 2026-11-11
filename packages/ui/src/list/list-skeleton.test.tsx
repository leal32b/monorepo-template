import { render, screen } from '@solidjs/testing-library'
import { ListSkeleton } from './list-skeleton'

describe('ListSkeleton', () => {
  afterEach(() => vi.useRealTimers())

  it('shows nothing for a quick load, then rows and what it waits for after a moment', () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
    const { container } = render(() => <ListSkeleton label="Loading…" rows={2} />)
    expect(screen.queryByRole('status')).not.toBeInTheDocument()

    vi.advanceTimersByTime(300)

    expect(screen.getByRole('status')).toHaveTextContent('Loading…')
    expect(container.querySelectorAll('.divide-y > div')).toHaveLength(2)
  })

  it('draws three rows unless told', () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
    const { container } = render(() => <ListSkeleton label="Loading…" />)
    vi.advanceTimersByTime(300)

    expect(container.querySelectorAll('.divide-y > div')).toHaveLength(3)
  })
})
