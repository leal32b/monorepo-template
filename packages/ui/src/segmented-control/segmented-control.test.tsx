import { fireEvent, render, screen } from '@solidjs/testing-library'
import { createSignal } from 'solid-js'
import { SegmentedControl } from './segmented-control'

const options = [
  { value: 'system', label: 'System', icon: 'monitor' as const },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' }
]

function Theme(props: { onChange?: (value: string) => void }) {
  const [value, setValue] = createSignal('system')
  return (
    <SegmentedControl
      label="Theme"
      options={options}
      value={value()}
      onChange={(next) => {
        setValue(next)
        props.onChange?.(next)
      }}
    />
  )
}

describe('SegmentedControl', () => {
  it('is a group named by its label, with one radio per option and the current one checked', () => {
    render(() => <Theme />)

    expect(screen.getByRole('radiogroup', { name: 'Theme' })).toBeInTheDocument()
    expect(screen.getAllByRole('radio')).toHaveLength(3)
    expect(screen.getByRole('radio', { name: 'System' })).toBeChecked()
    expect(screen.getByRole('radio', { name: 'Dark' })).not.toBeChecked()
  })

  it('changes the choice on click and tells the app', () => {
    const onChange = vi.fn()
    render(() => <Theme onChange={onChange} />)

    fireEvent.click(screen.getByRole('radio', { name: 'Dark' }))

    expect(onChange).toHaveBeenCalledWith('dark')
    expect(screen.getByRole('radio', { name: 'Dark' })).toBeChecked()
    expect(screen.getByRole('radio', { name: 'System' })).not.toBeChecked()
  })

  it('shows the selected item with a border, not a shadow', () => {
    render(() => <Theme />)
    const label = screen.getByText('System').closest('label')

    expect(label?.className).toContain('data-[checked]:border-border')
    expect(label?.className).not.toContain('shadow')
  })

  it('shows an icon only on the options that have one, hidden from screen readers', () => {
    const { container } = render(() => <Theme />)

    expect(container.querySelectorAll('svg')).toHaveLength(1)
    expect(container.querySelector('svg')).toHaveAttribute('aria-hidden', 'true')
  })

  it('adds a passed class to its own', () => {
    render(() => <SegmentedControl label="Theme" options={options} value="light" onChange={() => {}} class="mt-2" />)

    expect(screen.getByRole('radiogroup', { name: 'Theme' })).toHaveClass('mt-2', 'inline-flex')
  })
})
