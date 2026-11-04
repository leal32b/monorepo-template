import { render } from '@solidjs/testing-library'
import { Avatar } from './avatar'

describe('Avatar', () => {
  it('draws a person as a circle with the first letter, hidden from screen readers', () => {
    const { container } = render(() => <Avatar name=" ada Lovelace" />)
    const mark = container.firstElementChild as HTMLElement

    expect(mark).toHaveTextContent('A')
    expect(mark).toHaveClass('rounded-full', 'size-9')
    expect(mark).toHaveAttribute('aria-hidden', 'true')
  })

  it('draws an organization as a square, smaller in a menu, with a class of the screen’s', () => {
    const { container } = render(() => <Avatar name="Acme" shape="square" size="sm" class="mt-1" />)

    expect(container.firstElementChild).toHaveClass('rounded-md', 'size-8', 'mt-1')
  })

  it('draws an icon instead of a letter, for someone with no name yet', () => {
    const { container } = render(() => <Avatar icon="mail" />)

    expect(container.querySelector('svg')).toBeInTheDocument()
    expect(container.firstElementChild?.textContent).toBe('')
  })
})
