import { render, screen } from '@solidjs/testing-library'
import { Icon } from './icon'
import { icons } from './icons'

describe('Icon', () => {
  it('is decorative without a label, hidden from screen readers', () => {
    const { container } = render(() => <Icon name="home" />)
    const svg = container.querySelector('svg')

    expect(svg).toHaveAttribute('aria-hidden', 'true')
    expect(svg).not.toHaveAttribute('role')
    expect(screen.queryByRole('img')).not.toBeInTheDocument()
  })

  it('is an image named by its label when it stands alone', () => {
    render(() => <Icon name="search" label="Search" />)
    const image = screen.getByRole('img', { name: 'Search' })

    expect(image).not.toHaveAttribute('aria-hidden')
  })

  it('follows the size of the text around it, and a passed class is added to its own', () => {
    const { container } = render(() => <Icon name="check" class="text-success" />)

    expect(container.querySelector('svg')).toHaveClass('size-[1.25em]', 'shrink-0', 'text-success')
  })

  it('draws every name it offers', () => {
    for (const name of Object.keys(icons) as (keyof typeof icons)[]) {
      const { container, unmount } = render(() => <Icon name={name} />)

      expect(container.querySelector('svg')?.childElementCount).toBeGreaterThan(0)
      unmount()
    }
  })
})
