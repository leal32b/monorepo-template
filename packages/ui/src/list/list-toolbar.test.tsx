import { fireEvent, render, screen } from '@solidjs/testing-library'
import { SegmentedControl } from '#segmented-control'
import { ListToolbar, type ListToolbarProps } from './list-toolbar'

const renderToolbar = (props: Partial<ListToolbarProps> = {}) =>
  render(() => (
    <ListToolbar
      searchLabel="Search customers"
      searchButton="Find"
      searchValue=""
      onSearchInput={vi.fn()}
      onSearch={vi.fn()}
      {...props}
    />
  ))

/** The form around the search box and its button. */
const searchForm = () => screen.getByRole('searchbox').closest('form') as HTMLFormElement

describe('ListToolbar', () => {
  it('has a search box named by the caller, with the button that applies it', () => {
    renderToolbar({ searchValue: 'ada' })

    expect(screen.getByRole('searchbox', { name: 'Search customers' })).toHaveValue('ada')
    expect(screen.getByRole('button', { name: 'Find' })).toHaveAttribute('type', 'submit')
  })

  it('keeps the browser’s suggestions off the search box', () => {
    renderToolbar()

    expect(screen.getByRole('searchbox')).toHaveAttribute('autocomplete', 'off')
  })

  it('tells what is typed, as it is typed', () => {
    const onSearchInput = vi.fn()
    renderToolbar({ onSearchInput })

    fireEvent.input(screen.getByRole('searchbox'), { target: { value: 'grace' } })

    expect(onSearchInput).toHaveBeenCalledWith('grace')
  })

  it('applies the search when the form is sent, by its button or the keyboard, and stays on the page', () => {
    const onSearch = vi.fn()
    renderToolbar({ onSearch })

    screen.getByRole('button', { name: 'Find' }).click()
    const sent = fireEvent.submit(searchForm())

    expect(onSearch).toHaveBeenCalledTimes(2)
    // `fireEvent` answers false when a listener cancelled the event: the browser does not leave the page.
    expect(sent).toBe(false)
  })

  it('draws the filter it is given beside the search', () => {
    renderToolbar({
      children: (
        <SegmentedControl
          label="Show"
          value="active"
          onChange={vi.fn()}
          options={[
            { value: 'active', label: 'Active' },
            { value: 'archived', label: 'Archived' }
          ]}
        />
      )
    })

    expect(screen.getByRole('radio', { name: 'Archived' })).toBeInTheDocument()
  })

  it('draws the search alone when there is no filter', () => {
    renderToolbar()

    expect(screen.queryByRole('radio')).not.toBeInTheDocument()
  })

  it('lays the search and the filter in a row where it has room, by its own width, not the screen’s', () => {
    renderToolbar({ class: 'mt-4' })
    const row = searchForm().parentElement

    expect(row?.parentElement).toHaveClass('@container', 'mt-4')
    expect(row).toHaveClass('flex-col', '@md:flex-row')
  })
})
