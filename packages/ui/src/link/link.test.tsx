import { render, screen } from '@solidjs/testing-library'
import { Link } from './link'

describe('Link', () => {
  it('goes where it says, and is named by its text', () => {
    render(() => <Link href="/login">Sign in</Link>)

    expect(screen.getByRole('link', { name: 'Sign in' })).toHaveAttribute('href', '/login')
  })

  it('is underlined, so it stands out from the text around it by more than its colour', () => {
    render(() => <Link href="/login">Sign in</Link>)

    expect(screen.getByRole('link', { name: 'Sign in' })).toHaveClass('underline', 'focus-visible:outline-ring')
  })

  it('takes the attributes it is given, and a passed class overrides its own', () => {
    render(() => (
      <Link href="/login" aria-describedby="hint" class="no-underline">
        Sign in
      </Link>
    ))
    const link = screen.getByRole('link', { name: 'Sign in' })

    expect(link).toHaveAttribute('aria-describedby', 'hint')
    expect(link).toHaveClass('no-underline')
    expect(link).not.toHaveClass('underline')
  })
})
