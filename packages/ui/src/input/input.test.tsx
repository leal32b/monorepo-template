import { render, screen } from '@solidjs/testing-library'
import { Input } from './input'

describe('Input', () => {
  it('is a text input that takes the attributes it is given, and a passed class overrides its own', () => {
    render(() => <Input aria-label="Search" placeholder="Name or email" class="h-12" />)
    const input = screen.getByRole('textbox', { name: 'Search' })

    expect(input).toHaveAttribute('placeholder', 'Name or email')
    expect(input).toHaveClass('h-12')
    expect(input).not.toHaveClass('h-9')
  })

  it('is 44px tall with 16px text on phones, so iOS does not zoom in, and compact from sm up', () => {
    render(() => <Input aria-label="Search" />)

    expect(screen.getByRole('textbox', { name: 'Search' })).toHaveClass('h-11', 'text-base', 'sm:h-9', 'sm:text-sm')
  })
})
