import { createEffect, createSignal } from 'solid-js'
import { createRead, readAgain, updateRead } from '#shared/api'

/** A page of a list as the API answers it: the rows of this page, and how many there are in all. */
type Paged = { items: unknown[]; total: number; page: number; pageSize: number }

/** What a list is asked for now: the filter chosen, the words searched (none is `''`) and the page. */
type ListRequest<F> = { filter: F; search: string; page: number }

/** A router query (`createQuery`) that reads one page of a list. */
type PageQuery<A extends unknown[], P> = ((...args: A) => Promise<P>) & { keyFor: (...args: A) => string }

type ListOptions<F, A extends unknown[], P> = {
  /** The entity's query for one page, keyed by its arguments (ADR 0038). */
  query: PageQuery<A, P>
  /** The query's arguments for what the list is asked now: the organization, then what the query takes. */
  args: (request: ListRequest<F>) => [...A]
  /** The filter shown first. A list with no filter leaves it out, and `args` leaves it out of the query. */
  filter?: F
  /**
   * Called before the filter or the search changes what the list shows: the screen closes its open panel
   * and forgets what its rows said (`createListStatus`).
   */
  onChange?: (() => void) | undefined
}

/**
 * The state of a list read a page at a time, with a filter and a search: what is chosen, what is typed,
 * the page, and the read of that page, kept as ADR 0038 asks (`createRead`). A page seen before is drawn
 * at once and read again behind it, and a change to the list is drawn at once (`draw`) or asked again
 * (`again`). Typing asks nothing: the search applies when the user asks for it (`find`).
 *
 * A page that empties because its last row left (deleted, archived) gives way to the one before it.
 */
export function createList<F, A extends unknown[], P extends Paged>(options: ListOptions<F, A, P>) {
  const [filter, setFilter] = createSignal<F>(options.filter as F)
  const [typed, setTyped] = createSignal('')
  const [search, setSearch] = createSignal('')
  const [page, setPage] = createSignal(1)

  const request = () => options.args({ filter: filter(), search: search(), page: page() })
  const key = () => options.query.keyFor(...request())
  const loaded = createRead(() => options.query(...request()), key)
  const pages = () => {
    const now = loaded()
    return now ? Math.max(1, Math.ceil(now.total / now.pageSize)) : 1
  }

  createEffect(() => {
    const now = loaded()
    if (now && now.items.length === 0 && page() > 1) setPage(page() - 1)
  })

  return {
    /** The page now drawn, once there is one. */
    loaded,
    /** The key of the page asked for: where `draw` and `again` act. */
    key,
    filter,
    /** Chooses a filter, from the first page. */
    show: (next: F) => {
      options.onChange?.()
      setFilter(() => next)
      setPage(1)
    },
    /** The text in the search box, applied or not. */
    typed,
    setTyped,
    /** The words applied to the list: what the last `find` took from the box. */
    search,
    /** Applies what was typed, without its spaces, from the first page. */
    find: () => {
      options.onChange?.()
      setSearch(typed().trim())
      setPage(1)
    },
    page,
    pages,
    hasPrevious: () => page() > 1,
    hasNext: () => page() < pages(),
    previous: () => setPage(page() - 1),
    next: () => setPage(page() + 1),
    /** Draws a change to the page at once, on every screen that reads it, with no request (`updateRead`). */
    draw: (change: (now: P) => P) => updateRead<P>(key(), change),
    /** Asks the API for the page again, as when an action found the data already changed (`readAgain`). */
    again: () => readAgain(key())
  }
}
