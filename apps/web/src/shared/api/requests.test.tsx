import { render, screen, waitFor } from '@solidjs/testing-library'
import { createResource, createSignal, Show, Suspense, startTransition } from 'solid-js'
import { createRequests } from './requests'

describe('createRequests', () => {
  it('counts a request made inside a transition that waits, while it waits and after it', async () => {
    const requests = createRequests()
    const answers: Array<(response: Response) => void> = []
    const fetch = requests.track(() => new Promise((resolve) => answers.push(resolve)))
    const [page, setPage] = createSignal('first')
    // As a navigation of the router does: a transition that waits on what a screen reads under a
    // `Suspense` that has already shown its content, with the screen's request made inside it.
    function Screen() {
      const [text] = createResource(page, (name) =>
        name === 'first' ? name : fetch(`/${name}`).then((response) => response.text())
      )
      return <p>{text()}</p>
    }
    render(() => (
      <>
        <Show when={requests.busy()}>
          <p>Busy</p>
        </Show>
        <Suspense>
          <Screen />
        </Suspense>
      </>
    ))
    await screen.findByText('first')

    const moved = startTransition(() => setPage('second'))
    expect(await screen.findByText('Busy')).toBeInTheDocument()

    answers[0]?.(new Response('second'))
    await moved
    expect(await screen.findByText('second')).toBeInTheDocument()
    await waitFor(() => expect(screen.queryByText('Busy')).not.toBeInTheDocument())

    void fetch('/later')
    expect(await screen.findByText('Busy')).toBeInTheDocument()
  })

  it('is busy while any request is out, and idle once the last one answers', async () => {
    const requests = createRequests()
    const answers: Array<(response: Response) => void> = []
    const fetch = requests.track(() => new Promise((resolve) => answers.push(resolve)))

    expect(requests.busy()).toBe(false)
    const first = fetch('/a')
    const second = fetch('/b', { method: 'POST' })
    expect(requests.busy()).toBe(true)

    answers[0]?.(new Response('a'))
    await first
    expect(requests.busy()).toBe(true)

    answers[1]?.(new Response('b'))
    expect(await (await second).text()).toBe('b')
    expect(requests.busy()).toBe(false)
  })

  it('counts a request that fails, and lets the failure through', async () => {
    const requests = createRequests()
    const fetch = requests.track(() => Promise.reject(new TypeError('offline')))

    await expect(fetch('/a')).rejects.toThrow('offline')
    expect(requests.busy()).toBe(false)
  })

  it('passes what it was given to the fetch it wraps', async () => {
    const inner = vi.fn(async () => new Response())
    const init = { method: 'DELETE' }

    await createRequests().track(inner)('/a', init)

    expect(inner).toHaveBeenCalledWith('/a', init)
  })
})
