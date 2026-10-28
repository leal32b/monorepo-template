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
})
