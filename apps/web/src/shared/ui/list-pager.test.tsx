import { fireEvent, render, screen } from '@solidjs/testing-library'
import { I18nProvider, type Locale } from '#shared/config'
import { ListPager, type ListPagerProps } from './list-pager'

/** What a paged list gives its pager: where it is, and the moves it may make. */
const listAt = (page: number, pages: number, over: Partial<ListPagerProps['list']> = {}): ListPagerProps['list'] => ({
  loaded: () => ({ page }),
  pages: () => pages,
  hasPrevious: () => page > 1,
  hasNext: () => page < pages,
  previous: vi.fn(),
  next: vi.fn(),
  ...over
})

const renderPager = (list: ListPagerProps['list'], locale: Locale = 'en') =>
  render(() => (
    <I18nProvider locale={locale}>
      <ListPager label="Customers" list={list} />
    </I18nProvider>
  ))

describe('ListPager', () => {
  it('names the page and the pages there are, in a navigation named by the screen', () => {
    renderPager(listAt(2, 3))

    expect(screen.getByRole('navigation', { name: 'Customers' })).toBeInTheDocument()
    expect(screen.getByText('Page 2 of 3')).toBeInTheDocument()
  })

  it('draws nothing for a list of one page', () => {
    renderPager(listAt(1, 1))

    expect(screen.queryByRole('navigation')).not.toBeInTheDocument()
  })

  it('draws nothing before a page is read', () => {
    renderPager(listAt(1, 2, { loaded: () => undefined }))

    expect(screen.queryByRole('navigation')).not.toBeInTheDocument()
  })

  it('moves to the page before and the page after', () => {
    const list = listAt(2, 3)
    renderPager(list)

    fireEvent.click(screen.getByRole('button', { name: 'Previous' }))
    fireEvent.click(screen.getByRole('button', { name: 'Next' }))

    expect(list.previous).toHaveBeenCalledOnce()
    expect(list.next).toHaveBeenCalledOnce()
  })

  it('disables the end the list is at', () => {
    renderPager(listAt(1, 2))

    expect(screen.getByRole('button', { name: 'Previous' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Next' })).toBeEnabled()
  })

  it('says the page drawn, not the page asked for, while the next one comes', () => {
    renderPager(listAt(1, 2, { hasPrevious: () => true }))

    expect(screen.getByText('Page 1 of 2')).toBeInTheDocument()
  })

  it('speaks Portuguese', () => {
    renderPager(listAt(1, 2), 'pt-BR')

    expect(screen.getByText('Página 1 de 2')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Próxima' })).toBeInTheDocument()
  })
})
