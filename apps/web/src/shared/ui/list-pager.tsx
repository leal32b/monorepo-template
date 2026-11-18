import { Pager } from '@repo/ui'
import { Show } from 'solid-js'
import { useI18n } from '#shared/config'

export type ListPagerProps = {
  /** Names the navigation for screen readers: what is paged, such as "Customers". */
  label: string
  /** A list read a page at a time (`createList`): where it is, and the moves it may make. */
  list: {
    loaded: () => { page: number } | undefined
    pages: () => number
    hasPrevious: () => boolean
    hasNext: () => boolean
    previous: () => void
    next: () => void
  }
}

/**
 * The `Pager` of a list read a page at a time, with the words every list uses ("Previous", "Next", "Page 2
 * of 3"). It says the page drawn, which lags the page asked for while the next one comes, and draws nothing
 * for a list of one page. A list paged another way, such as by a cursor, uses `Pager` with its own words.
 */
export function ListPager(props: ListPagerProps) {
  const { t } = useI18n()

  return (
    <Show when={props.list.pages() > 1 ? props.list.loaded() : undefined}>
      {(loaded) => (
        <Pager
          label={props.label}
          previousLabel={t('list.pager.previous')}
          nextLabel={t('list.pager.next')}
          summary={t('list.pager.page', { page: loaded().page, pages: props.list.pages() })}
          hasPrevious={props.list.hasPrevious()}
          hasNext={props.list.hasNext()}
          onPrevious={props.list.previous}
          onNext={props.list.next}
        />
      )}
    </Show>
  )
}
