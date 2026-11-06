import { render, screen } from '@solidjs/testing-library'
import { createSignal, Show } from 'solid-js'
import { createLate } from './late'
import { motion } from './motion'

/** A skeleton of one stage of a wait, such as the session's, then the organization's. */
function Placeholder(props: { stage: string }) {
  const late = createLate()
  return (
    <Show when={late()}>
      <p>Waiting for the {props.stage}</p>
    </Show>
  )
}

describe('createLate', () => {
  beforeEach(() => vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'Date'] }))
  afterEach(() => vi.useRealTimers())

  it('shows a placeholder once its wait has lasted the delay, so a quick answer shows nothing', () => {
    render(() => <Placeholder stage="session" />)

    vi.advanceTimersByTime(motion.waitDelay - 1)
    expect(screen.queryByText('Waiting for the session')).not.toBeInTheDocument()
    vi.advanceTimersByTime(1)
    expect(screen.getByText('Waiting for the session')).toBeInTheDocument()
  })

  it('goes on with the wait when one placeholder takes over from another, instead of starting it over', () => {
    const [stage, setStage] = createSignal('session')
    render(() => (
      <Show when={stage()} keyed>
        {(current) => <Placeholder stage={current} />}
      </Show>
    ))

    vi.advanceTimersByTime(motion.waitDelay - 100)
    setStage('organization')
    vi.advanceTimersByTime(100)

    expect(screen.getByText('Waiting for the organization')).toBeInTheDocument()
  })

  it('shows at once a placeholder that takes over from one already shown', () => {
    const [stage, setStage] = createSignal('session')
    render(() => (
      <Show when={stage()} keyed>
        {(current) => <Placeholder stage={current} />}
      </Show>
    ))

    vi.advanceTimersByTime(motion.waitDelay)
    setStage('organization')

    expect(screen.getByText('Waiting for the organization')).toBeInTheDocument()
  })

  it('starts a new wait over, once nothing was waiting', async () => {
    const [waiting, setWaiting] = createSignal(true)
    render(() => (
      <Show when={waiting()}>
        <Placeholder stage="session" />
      </Show>
    ))
    vi.advanceTimersByTime(motion.waitDelay)
    setWaiting(false)
    await Promise.resolve()

    setWaiting(true)

    expect(screen.queryByText('Waiting for the session')).not.toBeInTheDocument()
    vi.advanceTimersByTime(motion.waitDelay)
    expect(screen.getByText('Waiting for the session')).toBeInTheDocument()
  })
})
