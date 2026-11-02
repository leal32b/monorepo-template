import { render, screen } from '@solidjs/testing-library'
import { Icon } from './icon'
import { hasDuotone, iconNames } from './icons'

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

  it('draws every name it offers, and in duotone the ones that come in it', () => {
    for (const name of iconNames) {
      const { container, unmount } = render(() => <Icon name={name} />)

      expect(container.querySelector('svg')?.childElementCount).toBeGreaterThan(0)
      unmount()
      if (hasDuotone(name)) {
        const duotone = render(() => <Icon name={name} weight="duotone" />)

        expect(duotone.container.querySelector('svg')?.childElementCount).toBeGreaterThan(0)
        duotone.unmount()
      }
    }
  })

  it('draws Phosphor on its 256 grid, filled with the text colour, regular unless told otherwise', () => {
    const { container } = render(() => (
      <>
        <Icon name="home" />
        <Icon name="home" weight="regular" />
        <Icon name="home" weight="duotone" />
      </>
    ))
    const [byDefault, regular, duotone] = container.querySelectorAll('svg')

    expect(byDefault).toHaveAttribute('viewBox', '0 0 256 256')
    expect(byDefault).toHaveAttribute('fill', 'currentColor')
    expect(byDefault?.innerHTML).toBe(regular?.innerHTML)
    expect(duotone?.innerHTML).not.toBe(regular?.innerHTML)
  })

  it('has duotone only for the icons listed for it, so the weight is a choice the types check', () => {
    expect(hasDuotone('home')).toBe(true)
    expect(hasDuotone('security')).toBe(true)
    expect(hasDuotone('close')).toBe(false)
    expect(hasDuotone('google')).toBe(false)
  })

  it('keeps the colours of a brand mark, which has no weight', () => {
    const { container } = render(() => <Icon name="google" />)

    expect(container.querySelector('svg')).toHaveAttribute('viewBox', '0 0 24 24')
    expect(container.querySelectorAll('path[fill^="#"]')).toHaveLength(4)
  })
})
