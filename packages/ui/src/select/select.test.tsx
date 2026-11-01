import { fireEvent, render, screen } from '@solidjs/testing-library'
import { createSignal } from 'solid-js'
import { Select } from './select'

const languages = [
  { value: 'en', label: 'English' },
  { value: 'es', label: 'Español' },
  { value: 'pt-BR', label: 'Português (Brasil)' }
]

describe('Select', () => {
  it('is a native select with one option per choice and the current one selected', () => {
    render(() => <Select aria-label="Language" options={languages} value="es" onChange={() => {}} />)
    const select = screen.getByRole('combobox', { name: 'Language' })

    expect(screen.getAllByRole('option').map((option) => option.textContent)).toEqual([
      'English',
      'Español',
      'Português (Brasil)'
    ])
    expect(select).toHaveValue('es')
  })

  it('tells the app the value chosen', () => {
    const onChange = vi.fn()
    render(() => <Select aria-label="Language" options={languages} value="en" onChange={onChange} />)

    fireEvent.change(screen.getByRole('combobox', { name: 'Language' }), { target: { value: 'pt-BR' } })

    expect(onChange).toHaveBeenCalledWith('pt-BR')
  })

  it('follows the value when the app changes it', () => {
    const [value, setValue] = createSignal('en')
    render(() => <Select aria-label="Language" options={languages} value={value()} onChange={() => {}} />)

    setValue('pt-BR')

    expect(screen.getByRole('combobox', { name: 'Language' })).toHaveValue('pt-BR')
  })

  it('looks like an input, 44px tall with 16px text on phones, with a chevron hidden from screen readers', () => {
    const { container } = render(() => (
      <Select aria-label="Language" options={languages} value="en" onChange={() => {}} />
    ))

    expect(screen.getByRole('combobox', { name: 'Language' })).toHaveClass(
      'h-11',
      'text-base',
      'sm:h-9',
      'appearance-none'
    )
    expect(container.querySelector('svg')).toHaveAttribute('aria-hidden', 'true')
  })

  it('adds a passed class to its outermost element, and passes the rest to the select', () => {
    const { container } = render(() => (
      <Select aria-label="Language" id="language" options={languages} value="en" onChange={() => {}} class="mt-2" />
    ))

    expect(container.firstElementChild).toHaveClass('mt-2', 'relative')
    expect(screen.getByRole('combobox', { name: 'Language' })).toHaveAttribute('id', 'language')
  })
})
