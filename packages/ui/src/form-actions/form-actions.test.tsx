import { render, screen } from '@solidjs/testing-library'
import { Button } from '#button'
import { FormActions } from './form-actions'

describe('FormActions', () => {
  it('stacks the buttons full width where the form is narrow, side by side where it is wide', () => {
    render(() => (
      <FormActions class="mt-6">
        <Button type="submit">Save</Button>
        <Button>Cancel</Button>
      </FormActions>
    ))
    const row = screen.getByRole('button', { name: 'Save' }).parentElement as HTMLElement

    expect(row).toHaveClass('flex-col', '*:w-full', '@md:flex-row', '@md:*:w-auto')
    expect(row.parentElement).toHaveClass('@container', 'mt-6')
    expect(row.lastElementChild).toHaveTextContent('Cancel')
  })
})
