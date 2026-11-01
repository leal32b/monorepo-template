import { render, screen, within } from '@solidjs/testing-library'
import { Badge } from '#badge'
import { Button } from '#button'
import { SettingsRow } from './settings-row'
import { SettingsSection } from './settings-section'

describe('SettingsSection', () => {
  it('is a region named by its heading, with a line saying what the rows do together', () => {
    render(() => (
      <SettingsSection title="Ways to sign in" description="How you get into your account.">
        <SettingsRow title="Password" />
      </SettingsSection>
    ))
    const region = screen.getByRole('region', { name: 'Ways to sign in' })

    expect(within(region).getByRole('heading', { level: 2, name: 'Ways to sign in' })).toBeInTheDocument()
    expect(region).toHaveTextContent('How you get into your account.')
    expect(within(region).getByText('Password')).toBeInTheDocument()
  })

  it('needs no description, and adds a passed class to its own', () => {
    render(() => (
      <SettingsSection title="Backup" class="mt-8">
        <SettingsRow title="Codes" />
      </SettingsSection>
    ))
    const region = screen.getByRole('region', { name: 'Backup' })

    expect(region.querySelector('header p')).toBeNull()
    expect(region).toHaveClass('mt-8', 'flex')
  })
})

describe('SettingsRow', () => {
  it('shows the title with its state, the description and the action', () => {
    render(() => (
      <SettingsRow
        icon="key"
        title="Password"
        badge={<Badge variant="success">On</Badge>}
        description="Change it at any time."
        action={<Button>Change</Button>}
      />
    ))

    expect(screen.getByText('Password')).toBeInTheDocument()
    expect(screen.getByText('On')).toBeInTheDocument()
    expect(screen.getByText('Change it at any time.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Change' })).toBeInTheDocument()
  })

  it('has an icon only when given one, hidden from screen readers', () => {
    const { container } = render(() => (
      <>
        <SettingsRow title="Plain" />
        <SettingsRow title="With icon" icon="phone" />
      </>
    ))

    expect(container.querySelectorAll('svg')).toHaveLength(1)
    expect(container.querySelector('svg')).toHaveAttribute('aria-hidden', 'true')
  })

  it('needs only a title: no description, action or panel', () => {
    const { container } = render(() => <SettingsRow title="Only a title" />)

    expect(container.querySelector('p')).toBeNull()
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
    expect(container.querySelector('.bg-surface.border-t')).toBeNull()
  })

  it('opens its form inline, below the row, on the surface', () => {
    render(() => (
      <SettingsRow
        title="Password"
        panel={
          <label>
            Current password
            <input />
          </label>
        }
      />
    ))
    const panel = screen.getByLabelText('Current password').closest('div')

    expect(panel).toHaveClass('bg-surface', 'border-t')
  })

  it('stacks the action below on phones, full width, and puts it on the right from sm up', () => {
    render(() => <SettingsRow title="Password" action={<Button>Change</Button>} />)
    const button = screen.getByRole('button', { name: 'Change' })

    expect(button.parentElement).toHaveClass('*:flex-1', 'sm:*:flex-none')
    expect(button.parentElement?.parentElement).toHaveClass('flex-col', 'sm:flex-row')
  })

  it('adds a passed class to its own and passes other attributes on', () => {
    render(() => <SettingsRow title="Password" class="opacity-50" data-testid="row" />)

    expect(screen.getByTestId('row')).toHaveClass('opacity-50')
  })
})
