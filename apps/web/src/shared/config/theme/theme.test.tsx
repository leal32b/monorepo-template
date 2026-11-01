import { render, screen } from '@solidjs/testing-library'
import { ThemeProvider, useTheme } from './theme'

const Probe = () => {
  const { theme, setTheme } = useTheme()
  return (
    <>
      <p>Theme: {theme()}</p>
      <button type="button" onClick={() => setTheme('dark')}>
        dark
      </button>
      <button type="button" onClick={() => setTheme('system')}>
        system
      </button>
    </>
  )
}

const root = document.documentElement

describe('ThemeProvider', () => {
  afterEach(() => {
    localStorage.clear()
    delete root.dataset.theme
  })

  it('follows the system when nothing is stored, with no theme on the page', () => {
    render(() => (
      <ThemeProvider>
        <Probe />
      </ThemeProvider>
    ))

    expect(screen.getByText('Theme: system')).toBeInTheDocument()
    expect(root).not.toHaveAttribute('data-theme')
  })

  it('starts from the theme stored on the device, and puts it on the page', () => {
    localStorage.setItem('theme', 'light')

    render(() => (
      <ThemeProvider>
        <Probe />
      </ThemeProvider>
    ))

    expect(screen.getByText('Theme: light')).toBeInTheDocument()
    expect(root).toHaveAttribute('data-theme', 'light')
  })

  it('ignores a stored value that is not a theme', () => {
    localStorage.setItem('theme', 'sepia')

    render(() => (
      <ThemeProvider>
        <Probe />
      </ThemeProvider>
    ))

    expect(screen.getByText('Theme: system')).toBeInTheDocument()
  })

  it('applies a chosen theme at once and keeps it on the device', () => {
    render(() => (
      <ThemeProvider>
        <Probe />
      </ThemeProvider>
    ))

    screen.getByRole('button', { name: 'dark' }).click()

    expect(root).toHaveAttribute('data-theme', 'dark')
    expect(localStorage.getItem('theme')).toBe('dark')
  })

  it('goes back to the system by forgetting the choice', () => {
    localStorage.setItem('theme', 'dark')
    render(() => (
      <ThemeProvider>
        <Probe />
      </ThemeProvider>
    ))

    screen.getByRole('button', { name: 'system' }).click()

    expect(root).not.toHaveAttribute('data-theme')
    expect(localStorage.getItem('theme')).toBeNull()
  })

  it('fails loudly outside a provider', () => {
    const Orphan = () => {
      useTheme()
      return null
    }

    expect(() => render(() => <Orphan />)).toThrow('useTheme must be used inside a ThemeProvider')
  })
})
