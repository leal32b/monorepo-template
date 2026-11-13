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

  it('offers what to do next below its line, when it has an action', () => {
    render(() => (
      <EmptyState
        icon="activity"
        title="Not in your plan"
        description="It comes with Pro."
        action={<a href="/acme/settings/billing">See plans</a>}
      />
    ))

    const link = screen.getByRole('link', { name: 'See plans' })
    expect(link.parentElement).toHaveClass('mt-2')
    expect(screen.getByText('It comes with Pro.').compareDocumentPosition(link)).toBe(Node.DOCUMENT_POSITION_FOLLOWING)
  })

  it('draws no place for an action it was not given', () => {
    const { container } = render(() => <EmptyState icon="home" title="Nothing here yet" action={undefined} />)

    expect(container.firstElementChild?.children).toHaveLength(2)
  })
})
