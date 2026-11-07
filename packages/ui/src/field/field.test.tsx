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

  it('is a text area for several lines when it is multiline, named and described like any field', () => {
    render(() => <Field multiline label="Notes" description="Up to 2000 characters." rows={4} />)
    const notes = screen.getByRole('textbox', { name: 'Notes' })

    expect(notes.tagName).toBe('TEXTAREA')
    expect(notes).toHaveAccessibleDescription('Up to 2000 characters.')
    expect(notes).toHaveAttribute('rows', '4')
    expect(notes).toHaveClass('min-h-24')
    expect(notes).not.toHaveClass('h-11')
  })

  it('leaves the number of rows to the browser when it is not given', () => {
    render(() => <Field multiline label="Notes" />)

    expect(screen.getByRole('textbox', { name: 'Notes' })).not.toHaveAttribute('rows', '4')
  })

  it('keeps the one line input as it was when it is not multiline', () => {
    render(() => <Field label="Name" />)

    expect(screen.getByRole('textbox', { name: 'Name' }).tagName).toBe('INPUT')
  })
})
