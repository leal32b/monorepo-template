import { fireEvent, render, screen } from '@solidjs/testing-library'
import { createSignal } from 'solid-js'
import { Field } from './field'

describe('Field', () => {
  it('names the input with its label and describes it with its hint', () => {
    render(() => <Field label="Email" description="We never share it." />)

    expect(screen.getByRole('textbox', { name: 'Email' })).toHaveAccessibleDescription('We never share it.')
  })

  it('marks the input invalid and reads the error with it, only while there is one', () => {
    const [error, setError] = createSignal<string | undefined>('Enter an email.')
    render(() => <Field label="Email" error={error()} />)
    const input = screen.getByRole('textbox', { name: 'Email' })

    expect(input).toBeInvalid()
    expect(input).toHaveAccessibleDescription('Enter an email.')

    setError(undefined)

    expect(input).not.toBeInvalid()
    expect(screen.queryByText('Enter an email.')).not.toBeInTheDocument()
  })

  it('reports what is typed', () => {
    const onChange = vi.fn()
    render(() => <Field label="Email" onChange={onChange} />)

    fireEvent.input(screen.getByRole('textbox', { name: 'Email' }), { target: { value: 'ana@example.com' } })

    expect(onChange).toHaveBeenCalledWith('ana@example.com')
  })
})
