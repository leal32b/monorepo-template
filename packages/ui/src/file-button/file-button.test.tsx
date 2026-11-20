import { fireEvent, render, screen } from '@solidjs/testing-library'
import { FileButton } from './file-button'

describe('FileButton', () => {
  it('opens the picker from the button, which is the one control people and screen readers reach', () => {
    render(() => (
      <FileButton accept="image/png" variant="secondary" onSelect={() => undefined}>
        Upload
      </FileButton>
    ))
    const input = document.querySelector('input[type=file]') as HTMLInputElement
    const click = vi.spyOn(input, 'click')

    fireEvent.click(screen.getByRole('button', { name: 'Upload' }))

    expect(click).toHaveBeenCalledOnce()
    expect(input).toHaveAttribute('accept', 'image/png')
    expect(input).toHaveAttribute('aria-hidden', 'true')
    expect(input).toHaveAttribute('tabindex', '-1')
  })

  it('hands over the file chosen, empties the input for the next choice, and nothing when none was chosen', () => {
    const onSelect = vi.fn()
    render(() => (
      <FileButton accept="image/png" onSelect={onSelect}>
        Upload
      </FileButton>
    ))
    const input = document.querySelector('input[type=file]') as HTMLInputElement
    const file = new File(['png'], 'logo.png', { type: 'image/png' })

    fireEvent.change(input, { target: { files: [file] } })
    fireEvent.change(input, { target: { files: [] } })

    expect(onSelect.mock.calls).toEqual([[file]])
    expect(input.value).toBe('')
  })

  it('waits like any button', () => {
    render(() => (
      <FileButton accept="image/png" disabled onSelect={() => undefined}>
        Upload
      </FileButton>
    ))

    expect(screen.getByRole('button', { name: 'Upload' })).toBeDisabled()
  })
})
