import { render, screen } from '@solidjs/testing-library'
import { EmptyState } from './empty-state'

describe('EmptyState', () => {
  it('says what is missing and what will fill it, with a decorative icon', () => {
    const { container } = render(() => (
      <EmptyState icon="home" title="Nothing here yet" description="What Acme works on shows up here." class="mt-4" />
    ))

    expect(screen.getByText('Nothing here yet')).toBeInTheDocument()
    expect(screen.getByText('What Acme works on shows up here.')).toBeInTheDocument()
    expect(container.querySelector('svg')?.parentElement).toHaveAttribute('aria-hidden', 'true')
    expect(container.firstElementChild).toHaveClass('text-center', 'mt-4')
  })

  it('needs no description', () => {
    const { container } = render(() => <EmptyState icon="home" title="Nothing here yet" />)

    expect(container.querySelectorAll('p')).toHaveLength(1)
  })
})
