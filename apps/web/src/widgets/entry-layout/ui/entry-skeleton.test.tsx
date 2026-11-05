import { render, screen } from '@solidjs/testing-library'
import { I18nProvider } from '#shared/config'
import { EntrySkeleton } from './entry-skeleton'

describe('EntrySkeleton', () => {
  it('shows nothing for a quick load, then the frame of an entry screen after a moment', () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
    render(() => (
      <I18nProvider locale="en">
        <EntrySkeleton />
      </I18nProvider>
    ))
    expect(screen.queryByRole('status')).not.toBeInTheDocument()

    vi.advanceTimersByTime(300)

    expect(screen.getByRole('status')).toHaveTextContent('Loading…')
    expect(screen.getByRole('main')).toHaveAttribute('aria-busy', 'true')
    vi.useRealTimers()
  })
})
