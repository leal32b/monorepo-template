import { render, screen } from '@solidjs/testing-library'
import { Pager } from './pager'

const renderPager = (props: Partial<Parameters<typeof Pager>[0]> = {}) =>
  render(() => (
    <Pager
      label="Customers pages"
      previousLabel="Previous"
      nextLabel="Next"
      summary="Page 2 of 3"
      onPrevious={vi.fn()}
      onNext={vi.fn()}
      {...props}
    />
  ))

describe('Pager', () => {
  it('is a navigation named by the caller, with the summary between the buttons', () => {
    renderPager()
    const nav = screen.getByRole('navigation', { name: 'Customers pages' })

    expect(nav).toHaveTextContent('Previous')
    expect(nav).toHaveTextContent('Page 2 of 3')
    expect(nav.lastElementChild).toHaveTextContent('Next')
  })

  it('asks for the previous and the next page', () => {
    const onPrevious = vi.fn()
    const onNext = vi.fn()
    renderPager({ onPrevious, onNext })

    screen.getByRole('button', { name: 'Previous' }).click()
    screen.getByRole('button', { name: 'Next' }).click()

    expect(onPrevious).toHaveBeenCalledOnce()
    expect(onNext).toHaveBeenCalledOnce()
  })

  it('disables the end it is at, and keeps both buttons in place', () => {
    renderPager({ hasPrevious: false, hasNext: false })

    expect(screen.getByRole('button', { name: 'Previous' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Next' })).toBeDisabled()
  })

  it('enables both by default', () => {
    renderPager()

    expect(screen.getByRole('button', { name: 'Previous' })).toBeEnabled()
    expect(screen.getByRole('button', { name: 'Next' })).toBeEnabled()
  })

  it('announces the page politely and holds buttons and summary to fixed places', () => {
    renderPager({ class: 'mt-4' })
    const summary = screen.getByRole('status')

    expect(summary).toHaveTextContent('Page 2 of 3')
    expect(summary).toHaveClass('flex-1', 'text-center', 'tabular-nums')
    expect(screen.getByRole('button', { name: 'Previous' })).toHaveClass('min-w-28')
    expect(screen.getByRole('button', { name: 'Next' })).toHaveClass('min-w-28')
    expect(screen.getByRole('navigation')).toHaveClass('mt-4')
  })
})
