import { fireEvent, render, screen } from '@solidjs/testing-library'
import { SelectField } from './select-field'

const options = [
  { value: 'member', label: 'Member' },
  { value: 'owner', label: 'Owner (you cannot give it)', disabled: true }
]

describe('SelectField', () => {
  it('names the select by its label and describes it by its hint', () => {
    render(() => (
      <SelectField
        label="Role"
        description="Some roles hold permissions you do not."
        options={options}
        value="member"
        onChange={() => {}}
        class="mt-2"
      />
    ))
    const select = screen.getByRole('combobox', { name: 'Role' })

    expect(select).toHaveAccessibleDescription('Some roles hold permissions you do not.')
    expect(select).toHaveValue('member')
    expect(select.closest('div.flex-col')).toHaveClass('mt-2')
  })

  it('says what was chosen, and needs no hint', () => {
    const onChange = vi.fn()
    render(() => <SelectField label="Role" name="role" options={options} value="member" onChange={onChange} />)
    const select = screen.getByRole('combobox', { name: 'Role' })

    fireEvent.change(select, { target: { value: 'member' } })

    expect(onChange).toHaveBeenCalledWith('member')
    expect(select).not.toHaveAttribute('aria-describedby')
  })
})
