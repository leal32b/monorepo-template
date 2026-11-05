import { render, screen } from '@solidjs/testing-library'
import { createSignal } from 'solid-js'
import { motion } from '#motion'
import { ProgressBar } from './progress-bar'

const bar = () => screen.queryByTestId('progress-bar')

describe('ProgressBar', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('shows nothing while the server is idle', () => {
    render(() => <ProgressBar active={false} />)

    vi.advanceTimersByTime(motion.progressMinimum * 10)
    expect(bar()).not.toBeInTheDocument()
  })

  it('shows nothing for a quick answer', () => {
    const [active, setActive] = createSignal(true)
    render(() => <ProgressBar active={active()} />)

    vi.advanceTimersByTime(motion.waitDelay - 1)
    setActive(false)
    vi.advanceTimersByTime(motion.progressMinimum * 10)

    expect(bar()).not.toBeInTheDocument()
  })

  it('shows a decorative stripe over the page once the wait is long enough', () => {
    render(() => <ProgressBar active class="top-1" />)

    vi.advanceTimersByTime(motion.waitDelay)

    expect(bar()).toHaveAttribute('aria-hidden', 'true')
    expect(bar()).toHaveClass('fixed', 'top-1')
    expect(bar()?.firstElementChild).toHaveClass('ds-progress', 'bg-primary')
  })

  it('stays the minimum time once shown, so it never flashes', () => {
    const [active, setActive] = createSignal(true)
    render(() => <ProgressBar active={active()} />)

    vi.advanceTimersByTime(motion.waitDelay)
    setActive(false)
    vi.advanceTimersByTime(motion.progressMinimum - 1)
    expect(bar()).toBeInTheDocument()

    vi.advanceTimersByTime(1)
    expect(bar()).not.toBeInTheDocument()
  })

  it('goes at once when it has already shown for the minimum time', () => {
    const [active, setActive] = createSignal(true)
    render(() => <ProgressBar active={active()} />)

    vi.advanceTimersByTime(motion.waitDelay + motion.progressMinimum)
    setActive(false)
    vi.advanceTimersByTime(0)

    expect(bar()).not.toBeInTheDocument()
  })

  it('keeps showing when the server starts working again before it goes', () => {
    const [active, setActive] = createSignal(true)
    render(() => <ProgressBar active={active()} />)

    vi.advanceTimersByTime(motion.waitDelay)
    setActive(false)
    setActive(true)
    vi.advanceTimersByTime(motion.progressMinimum * 10)

    expect(bar()).toBeInTheDocument()
  })
})
