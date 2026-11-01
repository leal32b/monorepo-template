import { fireEvent, render, screen } from '@solidjs/testing-library'
import { PaletteProvider, usePalette } from '#shared/config'
import { PaletteShortcut } from './palette-shortcut'

const State = () => <p>{usePalette().open() ? 'open' : 'closed'}</p>

function renderShortcut() {
  return render(() => (
    <PaletteProvider>
      <PaletteShortcut />
      <State />
    </PaletteProvider>
  ))
}

describe('PaletteShortcut', () => {
  it('opens the palette on Ctrl+K and closes it on the next', () => {
    renderShortcut()

    fireEvent.keyDown(window, { key: 'k', ctrlKey: true })
    expect(screen.getByText('open')).toBeInTheDocument()
    fireEvent.keyDown(window, { key: 'K', ctrlKey: true })
    expect(screen.getByText('closed')).toBeInTheDocument()
  })

  it('opens it on ⌘K too, and keeps the key from the browser', () => {
    renderShortcut()
    const event = new KeyboardEvent('keydown', { key: 'k', metaKey: true, cancelable: true })

    window.dispatchEvent(event)

    expect(screen.getByText('open')).toBeInTheDocument()
    expect(event.defaultPrevented).toBe(true)
  })

  it('leaves other keys alone', () => {
    renderShortcut()

    fireEvent.keyDown(window, { key: 'k' })
    fireEvent.keyDown(window, { key: 'j', ctrlKey: true })
    fireEvent.keyDown(window, { key: 'k', ctrlKey: true, altKey: true })

    expect(screen.getByText('closed')).toBeInTheDocument()
  })

  it('stops listening when the screen goes away', () => {
    const { unmount } = renderShortcut()
    unmount()
    const event = new KeyboardEvent('keydown', { key: 'k', ctrlKey: true, cancelable: true })

    window.dispatchEvent(event)

    expect(event.defaultPrevented).toBe(false)
  })
})
