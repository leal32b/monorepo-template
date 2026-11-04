import { fireEvent, render, screen } from '@solidjs/testing-library'
import { Checkbox } from './checkbox'
import { CheckboxGroup } from './checkbox-group'

describe('CheckboxGroup', () => {
  it('frames its checkboxes under their name, a group screen readers can name', () => {
    render(() => (
      <CheckboxGroup label="Members" class="sm:col-span-2">
        <Checkbox label="Add members" checked={false} onChange={() => {}} />
      </CheckboxGroup>
    ))
    const group = screen.getByRole('group', { name: 'Members' })

    expect(group).toHaveClass('rounded-md', 'border', 'sm:col-span-2')
    expect(screen.getByRole('checkbox', { name: 'Add members' })).toBeInTheDocument()
  })
})

describe('Checkbox, read only', () => {
  it('shows its value at full strength and does not change', () => {
    const onChange = vi.fn()
    render(() => <Checkbox label="Add members" checked readOnly onChange={onChange} />)
    const box = screen.getByRole('checkbox', { name: 'Add members' })

    fireEvent.click(screen.getByText('Add members'))

    expect(box).toBeChecked()
    expect(onChange).not.toHaveBeenCalled()
    expect(box).not.toBeDisabled()
  })
})
