import { fireEvent, render } from '@solidjs/testing-library'
import { createSignal } from 'solid-js'
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

  it('draws a person smaller still in a tab, the letter to its size', () => {
    const { container } = render(() => <Avatar name="Ada" size="xs" />)

    expect(container.firstElementChild).toHaveClass('rounded-full', 'size-6', 'text-xs')
  })

  it('draws an icon instead of a letter, for someone with no name yet', () => {
    const { container } = render(() => <Avatar icon="mail" />)

    expect(container.querySelector('svg')).toBeInTheDocument()
    expect(container.firstElementChild?.textContent).toBe('')
  })
})

describe('Avatar with an image (ADR 0076)', () => {
  it('shows the letter until the image loads, then the image alone, fitted whole in the same box', () => {
    const { container } = render(() => <Avatar name="Acme" shape="square" src="/logo.png" />)
    const image = container.querySelector('img') as HTMLImageElement

    expect(image).toHaveAttribute('alt', '')
    expect(image).toHaveClass('object-contain', 'size-full', 'opacity-0')
    expect(container.firstElementChild).toHaveTextContent('A')

    fireEvent.load(image)

    expect(image).toHaveClass('opacity-100')
    expect(container.firstElementChild?.textContent).toBe('')
    expect(container.firstElementChild).toHaveClass('size-9')
  })

  it('keeps the letter when the image cannot be loaded, and tries a new one when the address changes', () => {
    const [src, setSrc] = createSignal('/expired.png')
    const { container } = render(() => <Avatar name="Acme" src={src()} />)

    fireEvent.error(container.querySelector('img') as HTMLImageElement)

    expect(container.querySelector('img')).toBeNull()
    expect(container.firstElementChild).toHaveTextContent('A')
    setSrc('/new.png')
    expect(container.querySelector('img')).toHaveAttribute('src', '/new.png')
  })
})
