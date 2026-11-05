import { createRequests } from './requests'

describe('createRequests', () => {
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
