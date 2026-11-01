import { render, screen } from '@solidjs/testing-library'
import { Badge } from './badge'

describe('Badge', () => {
  it('names the state in text', () => {
    render(() => <Badge>Not set up</Badge>)

    expect(screen.getByText('Not set up')).toBeInTheDocument()
  })

  it('is neutral unless told otherwise, and takes its colour from the variant', () => {
    render(() => (
      <>
        <Badge>Off</Badge>
        <Badge variant="success">On</Badge>
        <Badge variant="warning">Slow</Badge>
        <Badge variant="destructive">Down</Badge>
      </>
    ))

    expect(screen.getByText('Off')).toHaveClass('text-muted-foreground')
    expect(screen.getByText('On')).toHaveClass('text-success')
    expect(screen.getByText('Slow')).toHaveClass('text-warning')
    expect(screen.getByText('Down')).toHaveClass('text-destructive')
  })

  it('shows a dot only when asked, hidden from screen readers', () => {
    const { container } = render(() => (
      <>
        <Badge>Plain</Badge>
        <Badge dot>Dotted</Badge>
      </>
    ))
    const [plain, dotted] = container.querySelectorAll('span.inline-flex')

    expect(plain?.querySelector('[aria-hidden="true"]')).toBeNull()
    expect(dotted?.querySelector('[aria-hidden="true"]')).toHaveClass('bg-current')
  })

  it('adds a passed class to its own and passes other attributes on', () => {
    render(() => (
      <Badge class="ml-2" data-testid="badge">
        On
      </Badge>
    ))

    expect(screen.getByTestId('badge')).toHaveClass('ml-2', 'rounded-full')
  })
})
