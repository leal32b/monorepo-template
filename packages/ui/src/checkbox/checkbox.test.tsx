import { fireEvent, render, screen } from '@solidjs/testing-library'
import { createSignal } from 'solid-js'
import { Checkbox } from './checkbox'

function Controlled(props: {
  disabled?: boolean
  description?: string | undefined
  onChange?: (checked: boolean) => void
}) {
  const [checked, setChecked] = createSignal(false)
  return (
    <Checkbox
      label="Invite"
      description={props.description}
      {...(props.disabled === undefined ? {} : { disabled: props.disabled })}
      checked={checked()}
      onChange={(value) => {
        setChecked(value)
        props.onChange?.(value)
      }}
    />
  )
}

describe('Checkbox', () => {
  it('is a checkbox named by its label, off to start with', () => {
    render(() => <Controlled />)

    expect(screen.getByRole('checkbox', { name: 'Invite' })).not.toBeChecked()
  })

  it('turns on and off from a click on the box or the label, telling the app', () => {
    const onChange = vi.fn()
    render(() => <Controlled onChange={onChange} />)

    fireEvent.click(screen.getByText('Invite'))
    expect(screen.getByRole('checkbox', { name: 'Invite' })).toBeChecked()
    fireEvent.click(screen.getByRole('checkbox', { name: 'Invite' }))

    expect(screen.getByRole('checkbox', { name: 'Invite' })).not.toBeChecked()
    expect(onChange.mock.calls).toEqual([[true], [false]])
  })

  it('draws the mark only when on', () => {
    const { container } = render(() => <Controlled />)
    expect(container.querySelector('svg')).toBeNull()

    fireEvent.click(screen.getByRole('checkbox', { name: 'Invite' }))

    expect(container.querySelector('svg')).toHaveAttribute('aria-hidden', 'true')
  })

  it('reads its description with the checkbox', () => {
    render(() => <Controlled description="You do not hold this permission." />)

    expect(screen.getByRole('checkbox', { name: 'Invite' })).toHaveAccessibleDescription(
      'You do not hold this permission.'
    )
  })

  it('does not change when disabled', () => {
    const onChange = vi.fn()
    render(() => <Controlled disabled onChange={onChange} />)

    fireEvent.click(screen.getByRole('checkbox', { name: 'Invite' }))

    expect(screen.getByRole('checkbox', { name: 'Invite' })).toBeDisabled()
    expect(onChange).not.toHaveBeenCalled()
  })

  it('adds a passed class to its own row', () => {
    const { container } = render(() => <Checkbox label="Invite" checked={false} onChange={() => {}} class="mt-4" />)

    expect(container.firstElementChild).toHaveClass('mt-4')
  })
})
