import { render, screen, within } from '@solidjs/testing-library'
import { createSignal, Show } from 'solid-js'
import { Badge } from '#badge'
import { Button } from '#button'
import { ListRow } from './list-row'
import { ListSection } from './list-section'

describe('ListSection', () => {
  it('is a region named by its heading, with a line saying what the rows do together', () => {
    render(() => (
      <ListSection title="Ways to sign in" description="How you get into your account.">
        <ListRow title="Password" />
      </ListSection>
    ))
    const region = screen.getByRole('region', { name: 'Ways to sign in' })

    expect(within(region).getByRole('heading', { level: 2, name: 'Ways to sign in' })).toBeInTheDocument()
    expect(region).toHaveTextContent('How you get into your account.')
    expect(within(region).getByText('Password')).toBeInTheDocument()
  })

  it('says what happened to the section below its rows, and gives that line focus', async () => {
    const [status, setStatus] = createSignal<string>()
    render(() => (
      <ListSection title="People" status={status()}>
        <ListRow title="Grace" />
      </ListSection>
    ))
    const line = within(screen.getByRole('region', { name: 'People' }))
      .getAllByRole('status')
      .at(-1) as HTMLElement
    expect(line).toBeEmptyDOMElement()
    expect(line).not.toHaveFocus()

    setStatus('Grace was removed.')

    expect(line).toHaveTextContent('Grace was removed.')
    expect(line).toHaveFocus()
  })

  it('needs no description, and adds a passed class to its own', () => {
    render(() => (
      <ListSection title="Backup" class="mt-8">
        <ListRow title="Codes" />
      </ListSection>
    ))
    const region = screen.getByRole('region', { name: 'Backup' })

    expect(region.querySelector('header p')).toBeNull()
    expect(region).toHaveClass('mt-8', 'flex')
  })
})

describe('ListRow', () => {
  it('shows the title with its state, the description and the action', () => {
    render(() => (
      <ListRow
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

  it('says why something cannot be done in a note under the description, with a hidden icon', () => {
    const { container } = render(() => (
      <ListRow title="Ada" description="ada@example.com" note="The only owner. Make someone else an owner first." />
    ))

    expect(screen.getByText('The only owner. Make someone else an owner first.')).toBeInTheDocument()
    expect(container.querySelector('svg')).toHaveAttribute('aria-hidden', 'true')
  })

  it('has no note, and no room for one, unless given', () => {
    const { container } = render(() => <ListRow title="Ada" description="ada@example.com" />)

    expect(container.querySelector('svg')).toBeNull()
  })

  it('has an icon only when given one, hidden from screen readers', () => {
    const { container } = render(() => (
      <>
        <ListRow title="Plain" />
        <ListRow title="With icon" icon="phone" />
      </>
    ))

    expect(container.querySelectorAll('svg')).toHaveLength(1)
    expect(container.querySelector('svg')).toHaveAttribute('aria-hidden', 'true')
  })

  it("has an avatar in the icon's place, for a row about a person", () => {
    const { container } = render(() => (
      <ListRow title="Grace" icon="profile" avatar={<span data-testid="avatar">G</span>} />
    ))

    expect(screen.getByTestId('avatar')).toBeInTheDocument()
    expect(container.querySelector('svg')).toBeNull()
  })

  it("has a letter in the icon's place for a mark the icon set lacks", () => {
    const { container } = render(() => <ListRow title="Google" letter="G" />)

    expect(container.querySelector('svg')).toBeNull()
    expect(screen.getByText('G')).toBeInTheDocument()
    expect(screen.getByText('G').parentElement).toHaveAttribute('aria-hidden', 'true')
  })

  it('announces what just happened in the row, in an area that is always there', () => {
    render(() => <ListRow title="Password" status="Your password was changed." />)

    expect(screen.getByRole('status')).toHaveTextContent('Your password was changed.')
    expect(screen.getByRole('status')).toHaveClass('text-success')
    expect(screen.getByRole('status').querySelector('svg')).toHaveAttribute('aria-hidden', 'true')
  })

  it('keeps the status area, empty, when nothing happened', () => {
    render(() => <ListRow title="Password" />)

    expect(screen.getByRole('status')).toBeEmptyDOMElement()
  })

  it('needs only a title: no description, action or panel', () => {
    const { container } = render(() => <ListRow title="Only a title" />)

    expect(container.querySelector('p:not([role])')).toBeNull()
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
    expect(container.querySelector('.bg-surface.border-t')).toBeNull()
  })

  it('opens its form inline, below the row, on the surface', () => {
    render(() => (
      <ListRow
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

  it('stacks the action below where the row is narrow, full width, and puts it on the right where it is wide', () => {
    render(() => <ListRow title="Password" action={<Button>Change</Button>} data-testid="row" />)
    const button = screen.getByRole('button', { name: 'Change' })

    // The row's own width decides, not the screen's: it is a container, and its parts query it.
    expect(screen.getByTestId('row')).toHaveClass('@container')
    expect(button.parentElement).toHaveClass('*:flex-1', '@md:*:flex-none')
    expect(button.parentElement?.parentElement).toHaveClass('flex-col', '@md:flex-row')
  })

  it('breaks a word too long for the row, such as an email, so nothing runs past a phone screen (W11)', () => {
    const email = 'maximilianaalexandrinamontgomerywolfenstein@example.com'
    render(() => <ListRow title={email} description={email} note={`Held by ${email}`} />)
    const [title, description] = screen.getAllByText(email)

    // `overflow-wrap: anywhere`, which a flex item's narrowest width counts too, on the column of the texts.
    const column = title?.closest('.break-anywhere')
    expect(column).not.toBeNull()
    expect(column).toContainElement(description as HTMLElement)
    expect(column).toContainElement(screen.getByText(`Held by ${email}`))
  })

  it('draws no action area and no panel when what it was given draws nothing, such as a Show that is off', () => {
    const { container } = render(() => (
      <ListRow
        title="Password"
        action={<Show when={false}>{<Button>Change</Button>}</Show>}
        panel={<Show when={false}>A form</Show>}
      />
    ))

    expect(container.querySelector('.bg-surface.border-t')).toBeNull()
    expect(container.querySelector('.shrink-0.gap-2')).toBeNull()
  })

  it('adds a passed class to its own and passes other attributes on', () => {
    render(() => <ListRow title="Password" class="opacity-50" data-testid="row" />)

    expect(screen.getByTestId('row')).toHaveClass('opacity-50')
  })
})
