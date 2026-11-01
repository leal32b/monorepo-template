import { createContext, createEffect, createSignal, type ParentProps, useContext } from 'solid-js'
import { readStored, store } from '../device/device-storage'

export const themes = ['system', 'light', 'dark'] as const

/** "system" follows the device's light or dark; the others hold whatever the device says. */
export type Theme = (typeof themes)[number]

/** The key `public/theme.js` reads too, to set the theme before the first paint (ADR 0028). */
const key = 'theme'

function readTheme(): Theme {
  const stored = readStored(key)
  return stored === 'light' || stored === 'dark' ? stored : 'system'
}

function createTheme() {
  const [theme, setTheme] = createSignal(readTheme())
  // The preset paints by `data-theme` on <html>; with none, by the system's preference.
  createEffect(() => {
    const current = theme()
    if (current === 'system') delete document.documentElement.dataset.theme
    else document.documentElement.dataset.theme = current
  })
  /** Applies the theme at once and keeps it on this device; "system" forgets the choice. */
  const changeTheme = (next: Theme) => {
    store(key, next === 'system' ? undefined : next)
    setTheme(next)
  }
  return { theme, setTheme: changeTheme }
}

type ThemeState = ReturnType<typeof createTheme>

const ThemeContext = createContext<ThemeState>()

/** The theme chosen on this device, read when the app starts; change it with `setTheme` from `useTheme()`. */
export function ThemeProvider(props: ParentProps) {
  return <ThemeContext.Provider value={createTheme()}>{props.children}</ThemeContext.Provider>
}

export function useTheme(): ThemeState {
  const value = useContext(ThemeContext)
  if (!value) throw new Error('useTheme must be used inside a ThemeProvider')
  return value
}
