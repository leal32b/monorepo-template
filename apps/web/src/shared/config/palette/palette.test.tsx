import { render, screen } from '@solidjs/testing-library'
import { modifierKey, PaletteProvider, usePalette } from './palette'

const Probe = () => {
  const { open, setOpen, toggle } = usePalette()
  return (
    <>
      <p>{open() ? 'open' : 'closed'}</p>
      <button type="button" onClick={toggle}>
        toggle
      </button>
      <button type="button" onClick={() => setOpen(false)}>
        close
      </button>
    </>
  )
}

describe('PaletteProvider', () => {
  it('starts closed, and opens and closes', () => {
    render(() => (
      <PaletteProvider>
        <Probe />
      </PaletteProvider>
    ))
    expect(screen.getByText('closed')).toBeInTheDocument()

    screen.getByRole('button', { name: 'toggle' }).click()
    expect(screen.getByText('open')).toBeInTheDocument()

    screen.getByRole('button', { name: 'toggle' }).click()
    expect(screen.getByText('closed')).toBeInTheDocument()

    screen.getByRole('button', { name: 'toggle' }).click()
    screen.getByRole('button', { name: 'close' }).click()
    expect(screen.getByText('closed')).toBeInTheDocument()
  })

  it('fails loudly outside a provider', () => {
    const Orphan = () => {
      usePalette()
      return null
    }

    expect(() => render(() => <Orphan />)).toThrow('usePalette must be used inside a PaletteProvider')
  })
})

describe('modifierKey', () => {
  it.each(['MacIntel', 'iPhone', 'iPad'])('is ⌘ on %s', (platform) => {
    expect(modifierKey(platform)).toBe('⌘')
  })

  it.each(['Win32', 'Linux x86_64', ''])('is Ctrl on %s', (platform) => {
    expect(modifierKey(platform)).toBe('Ctrl')
  })
})
