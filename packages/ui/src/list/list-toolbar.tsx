import type { JSX } from 'solid-js'
import { Button } from '#button'
import { Field } from '#field'
import { cn } from '#libs'

export type ListToolbarProps = {
  /** What the search looks for, which names its box for screen readers ("Search customers"). */
  searchLabel: string
  /** The button that applies the search ("Find"). */
  searchButton: string
  /** What is typed in the box. */
  searchValue: string
  onSearchInput: (value: string) => void
  /** Applies the search, from the button or the keyboard; the page is not left. */
  onSearch: () => void
  /** The filter beside the search, such as a `SegmentedControl`. */
  children?: JSX.Element
  class?: string | undefined
}

/**
 * What sits above a `ListSection` to find things in it: a search that applies when asked, not on every
 * keystroke, and the filter beside it, if the list has one. Stacked on a phone; side by side where the
 * toolbar has room, by its own width, since it may sit in a narrow column as well as a wide one.
 */
export function ListToolbar(props: ListToolbarProps) {
  return (
    <div class={cn('@container', props.class)}>
      <div class="flex flex-col gap-3 @md:flex-row @md:items-end @md:justify-between">
        <form
          noValidate
          class="flex items-end gap-2 @md:flex-1"
          onSubmit={(event) => {
            event.preventDefault()
            props.onSearch()
          }}
        >
          <Field
            class="flex-1"
            label={props.searchLabel}
            name="search"
            type="search"
            autocomplete="off"
            value={props.searchValue}
            onChange={props.onSearchInput}
          />
          <Button type="submit" variant="secondary">
            {props.searchButton}
          </Button>
        </form>
        {props.children}
      </div>
    </div>
  )
}
