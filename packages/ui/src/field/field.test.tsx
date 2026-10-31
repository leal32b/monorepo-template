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

  it("puts an error in its hint's place, so the two never say the same thing twice", () => {
    const [error, setError] = createSignal<string | undefined>('Enter an email, like ana@example.com.')
    render(() => <Field label="Email" description="We never share it." error={error()} />)
    const input = screen.getByRole('textbox', { name: 'Email' })

    expect(input).toHaveAccessibleDescription('Enter an email, like ana@example.com.')
    expect(screen.queryByText('We never share it.')).not.toBeInTheDocument()

    setError(undefined)

    expect(input).toHaveAccessibleDescription('We never share it.')
  })

  it('reports what is typed', () => {
    const onChange = vi.fn()
    render(() => <Field label="Email" onChange={onChange} />)

    fireEvent.input(screen.getByRole('textbox', { name: 'Email' }), { target: { value: 'ana@example.com' } })

    expect(onChange).toHaveBeenCalledWith('ana@example.com')
  })
})
