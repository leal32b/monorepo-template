import { MemoryRouter, Route } from '@solidjs/router'
import { render, screen, waitFor } from '@solidjs/testing-library'
import { For, Show, Suspense } from 'solid-js'
import { createQuery } from '#shared/api'
import { createList } from './create-list'

type Kind = 'staff' | 'guest'
type Person = { name: string; kind: Kind }
type People = { items: Person[]; total: number; page: number; pageSize: number }

const pageSize = 10
/** Twenty staff and five guests: two pages of staff, one of guests. */
const everyone: Person[] = Array.from({ length: 25 }, (_, i) => ({
  name: `Person ${String(i).padStart(2, '0')}`,
  kind: i % 5 === 0 ? 'guest' : 'staff'
}))

const pageOf = (matching: Person[], page: number): People => ({
  items: matching.slice((page - 1) * pageSize, page * pageSize),
  total: matching.length,
  page,
  pageSize
})

let queries = 0
/** A query named anew per test, since the router keeps an answer for the next read of its key. */
const nameOfQuery = () => `people-${queries++}`

/** The people by kind, search and page, asking what each read asked. */
function fakePeople() {
  const asked: Array<{ kind: Kind; search: string; page: number }> = []
  const people = createQuery(async (kind: Kind, search: string, page: number) => {
    asked.push({ kind, search, page })
    return pageOf(
      everyone.filter((person) => person.kind === kind && person.name.includes(search)),
      page
    )
  }, nameOfQuery())
  return { people, asked }
}

const staffList = (people: ReturnType<typeof fakePeople>['people'], onChange?: () => void) =>
  createList({
    query: people,
    args: ({ filter, search, page }) => [filter, search, page],
    filter: 'staff' as Kind,
    onChange
  })

/** Draws a screen that holds the list, and hands the list back to the test. */
function drawList<L extends { loaded: () => People | undefined }>(make: () => L) {
  const held: { list?: L } = {}
  function Screen() {
    held.list = make()
    const list = held.list
    return (
      <Show when={list.loaded()}>
        {(loaded) => (
          <ul>
            <For each={loaded().items}>{(person) => <li>{person.name}</li>}</For>
          </ul>
        )}
      </Show>
    )
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
  return () => held.list as L
}

describe('createList', () => {
  it('reads the first page of the filter it starts with, and the key of that read', async () => {
    const { people, asked } = fakePeople()
    const list = drawList(() => staffList(people))

    expect(await screen.findByText('Person 01')).toBeInTheDocument()
    expect(asked).toEqual([{ kind: 'staff', search: '', page: 1 }])
    expect(list().filter()).toBe('staff')
    expect(list().page()).toBe(1)
    expect(list().search()).toBe('')
    expect(list().key()).toBe(people.keyFor('staff', '', 1))
  })

  describe('the filter', () => {
    it('is chosen from the first page, and says the view is changing', async () => {
      const { people, asked } = fakePeople()
      const onChange = vi.fn()
      const list = drawList(() => staffList(people, onChange))
      await screen.findByText('Person 01')
      list().next()
      await screen.findByText('Person 11')

      list().show('guest')

      expect(await screen.findByText('Person 05')).toBeInTheDocument()
      expect(asked.at(-1)).toEqual({ kind: 'guest', search: '', page: 1 })
      expect(list().filter()).toBe('guest')
      expect(onChange).toHaveBeenCalledTimes(1)
    })
  })

  describe('the search', () => {
    it('asks nothing while the text is typed', async () => {
      const { people, asked } = fakePeople()
      const list = drawList(() => staffList(people))
      await screen.findByText('Person 01')

      list().setTyped('  Person 1 ')

      expect(list().typed()).toBe('  Person 1 ')
      expect(list().search()).toBe('')
      expect(asked).toHaveLength(1)
    })

    it('applies the text without its spaces, from the first page, and says the view is changing', async () => {
      const { people, asked } = fakePeople()
      const onChange = vi.fn()
      const list = drawList(() => staffList(people, onChange))
      await screen.findByText('Person 01')
      list().next()
      await screen.findByText('Person 11')
      list().setTyped('  Person 1 ')

      list().find()

      await waitFor(() => expect(screen.queryByText('Person 02')).not.toBeInTheDocument())
      expect(asked.at(-1)).toEqual({ kind: 'staff', search: 'Person 1', page: 1 })
      expect(list().search()).toBe('Person 1')
      expect(onChange).toHaveBeenCalledTimes(1)
    })
  })

  describe('the page', () => {
    it('moves between pages, which the first and the last end limit', async () => {
      const { people, asked } = fakePeople()
      const list = drawList(() => staffList(people))
      await screen.findByText('Person 01')

      expect(list().pages()).toBe(2)
      expect(list().hasPrevious()).toBe(false)
      expect(list().hasNext()).toBe(true)
      list().next()

      expect(await screen.findByText('Person 11')).toBeInTheDocument()
      expect(asked.at(-1)).toEqual({ kind: 'staff', search: '', page: 2 })
      expect(list().page()).toBe(2)
      expect(list().hasPrevious()).toBe(true)
      expect(list().hasNext()).toBe(false)
      list().previous()

      expect(await screen.findByText('Person 01')).toBeInTheDocument()
      expect(list().page()).toBe(1)
    })

    it('is one for a list with nothing in it', async () => {
      const { people } = fakePeople()
      const list = drawList(() => staffList(people))
      await screen.findByText('Person 01')
      list().setTyped('nobody')

      list().find()

      await waitFor(() => expect(screen.queryByText('Person 01')).not.toBeInTheDocument())
      expect(list().pages()).toBe(1)
      expect(list().hasNext()).toBe(false)
    })

    it('gives way to the one before when it empties because its last row left', async () => {
      const { people } = fakePeople()
      const list = drawList(() => staffList(people))
      await screen.findByText('Person 01')
      list().next()
      await screen.findByText('Person 11')

      list().draw((loaded) => ({ ...loaded, items: [], total: 10 }))

      expect(await screen.findByText('Person 01')).toBeInTheDocument()
      expect(list().page()).toBe(1)
    })

    it('stays on the first page when that is the one that is empty', async () => {
      const { people } = fakePeople()
      const list = drawList(() => staffList(people))
      await screen.findByText('Person 01')

      list().draw((loaded) => ({ ...loaded, items: [], total: 0 }))

      await waitFor(() => expect(screen.queryByText('Person 01')).not.toBeInTheDocument())
      expect(list().page()).toBe(1)
    })
  })

  describe('after a change', () => {
    it('draws what an action changed at once, with no request', async () => {
      const { people, asked } = fakePeople()
      const list = drawList(() => staffList(people))
      await screen.findByText('Person 01')

      list().draw((loaded) => ({
        ...loaded,
        items: loaded.items.map((person) => (person.name === 'Person 01' ? { ...person, name: 'Ada' } : person))
      }))

      expect(await screen.findByText('Ada')).toBeInTheDocument()
      expect(asked).toHaveLength(1)
    })

    it('asks the API again when the data was found changed', async () => {
      const { people, asked } = fakePeople()
      const list = drawList(() => staffList(people))
      await screen.findByText('Person 01')

      list().again()

      await waitFor(() => expect(asked).toHaveLength(2))
      expect(asked[1]).toEqual({ kind: 'staff', search: '', page: 1 })
    })
  })

  it('serves a list with no filter, which the query then leaves out', async () => {
    const asked: Array<[string, number]> = []
    const everybody = createQuery(async (search: string, page: number) => {
      asked.push([search, page])
      return pageOf(
        everyone.filter((person) => person.name.includes(search)),
        page
      )
    }, nameOfQuery())
    const list = drawList(() => createList({ query: everybody, args: ({ search, page }) => [search, page] }))

    expect(await screen.findByText('Person 00')).toBeInTheDocument()
    expect(asked).toEqual([['', 1]])
    expect(list().filter()).toBeUndefined()
    expect(list().pages()).toBe(3)
  })
})
