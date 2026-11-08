import { MemoryRouter, Route } from '@solidjs/router'
import { render, screen, waitFor } from '@solidjs/testing-library'
import { createSignal, Suspense } from 'solid-js'
import { createQuery } from './create-query'
import { createRead, keysRead, readAgain, updateRead } from './create-read'

describe('createRead (ADR 0038)', () => {
  afterEach(() => vi.useRealTimers())

  it('waits for a key never read, then draws a key read before at once and reads it again behind', async () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    const answers: Array<(value: string) => void> = []
    const list = createQuery(
      (id: string) =>
        new Promise<string>((resolve) => {
          answers.push((value) => resolve(`${value} of ${id}`))
        }),
      'a-list'
    )
    function Screen() {
      const value = createRead(() => list('a'), list.keyFor('a'))
      return <p>{value()}</p>
    }
    const draw = () =>
      render(() => (
        <MemoryRouter>
          <Route
            path="/"
            component={() => (
              <Suspense fallback={<p>Waiting</p>}>
                <Screen />
              </Suspense>
            )}
          />
        </MemoryRouter>
      ))

    const first = draw()
    expect(await screen.findByText('Waiting')).toBeInTheDocument()
    answers[0]?.('The first answer')
    expect(await screen.findByText('The first answer of a')).toBeInTheDocument()
    first.unmount()
    // Past the moment the router reuses a read for on its own.
    vi.setSystemTime(Date.now() + 60_000)

    draw()

    expect(screen.getByText('The first answer of a')).toBeInTheDocument()
    await waitFor(() => expect(answers).toHaveLength(2))
    answers[1]?.('The second answer')
    expect(await screen.findByText('The second answer of a')).toBeInTheDocument()
  })

  /** Screens that read the same key, as Members and Roles read the members. */
  function drawScreens(read: () => Promise<string>, key: string, count = 1) {
    function Screen() {
      const value = createRead(read, key)
      return <p>{value()}</p>
    }
    render(() => (
      <MemoryRouter>
        <Route
          path="/"
          component={() => (
            <Suspense fallback={<p>Waiting</p>}>
              {Array.from({ length: count }, () => (
                <Screen />
              ))}
            </Suspense>
          )}
        />
      </MemoryRouter>
    ))
  }

  it('draws what an action changed on every screen that reads its key, with no request', async () => {
    const asked = vi.fn(async (id: string) => `Ada and Grace, of ${id}`)
    const people = createQuery(asked, 'people')
    drawScreens(() => people('a'), people.keyFor('a'), 2)
    expect(await screen.findAllByText('Ada and Grace, of a')).toHaveLength(2)

    updateRead<string>(people.keyFor('a'), (value) => value.replace('Grace', 'Linus'))

    expect(await screen.findAllByText('Ada and Linus, of a')).toHaveLength(2)
    expect(asked).toHaveBeenCalledTimes(1)
  })

  it('changes nothing for a key never read', () => {
    expect(() => updateRead<string>('never-read[]', (value) => `${value}!`)).not.toThrow()
  })

  it('asks again for a key when told, keeping what is drawn until the answer comes', async () => {
    const answers: Array<(value: string) => void> = []
    const people = createQuery(
      () =>
        new Promise<string>((resolve) => {
          answers.push(resolve)
        }),
      'people-again'
    )
    drawScreens(() => people(), people.keyFor())
    answers[0]?.('Ada and Grace')
    expect(await screen.findByText('Ada and Grace')).toBeInTheDocument()

    readAgain(people.keyFor())

    await waitFor(() => expect(answers).toHaveLength(2))
    expect(screen.getByText('Ada and Grace')).toBeInTheDocument()
    answers[1]?.('Ada')
    expect(await screen.findByText('Ada')).toBeInTheDocument()
  })

  it('asks again on the next read of a key no screen reads now', async () => {
    const asked = vi.fn(async () => 'Ada')
    const people = createQuery(asked, 'people-unread')
    await people()

    readAgain(people.keyFor())
    await people()

    expect(asked).toHaveBeenCalledTimes(2)
  })

  it('follows a key that changes, keeping the last page drawn until the next one comes, and takes changes for the current key', async () => {
    const answers = new Map<number, (value: string) => void>()
    const pages = createQuery(
      (page: number) =>
        new Promise<string>((resolve) => {
          answers.set(page, resolve)
        }),
      'pages'
    )
    const [page, setPage] = createSignal(1)
    function Screen() {
      const value = createRead(
        () => pages(page()),
        () => pages.keyFor(page())
      )
      return <p>{value()}</p>
    }
    render(() => (
      <MemoryRouter>
        <Route
          path="/"
          component={() => (
            <Suspense fallback={<p>Waiting</p>}>
              <Screen />
            </Suspense>
          )}
        />
      </MemoryRouter>
    ))
    answers.get(1)?.('Ada, page 1')
    expect(await screen.findByText('Ada, page 1')).toBeInTheDocument()

    setPage(2)

    await waitFor(() => expect(answers.has(2)).toBe(true))
    expect(screen.getByText('Ada, page 1')).toBeInTheDocument()
    answers.get(2)?.('Grace, page 2')
    expect(await screen.findByText('Grace, page 2')).toBeInTheDocument()

    updateRead<string>(pages.keyFor(1), () => 'not drawn')
    expect(screen.getByText('Grace, page 2')).toBeInTheDocument()
    updateRead<string>(pages.keyFor(2), (value) => `${value}, changed`)
    expect(await screen.findByText('Grace, page 2, changed')).toBeInTheDocument()
  })

  it('forgets a key once its last screen leaves it, by moving to another key or by closing', async () => {
    const searches = createQuery(async (term: string) => `found ${term}`, 'searches')
    const [term, setTerm] = createSignal('ada')
    function Screen() {
      const value = createRead(
        () => searches(term()),
        () => searches.keyFor(term())
      )
      return <p>{value()}</p>
    }
    const { unmount } = render(() => (
      <MemoryRouter>
        <Route
          path="/"
          component={() => (
            <Suspense fallback={<p>Waiting</p>}>
              <Screen />
            </Suspense>
          )}
        />
      </MemoryRouter>
    ))
    expect(await screen.findByText('found ada')).toBeInTheDocument()

    setTerm('grace')

    expect(await screen.findByText('found grace')).toBeInTheDocument()
    expect(keysRead()).not.toContain(searches.keyFor('ada'))
    expect(keysRead()).toContain(searches.keyFor('grace'))
    unmount()
    expect(keysRead()).not.toContain(searches.keyFor('grace'))
  })
})
