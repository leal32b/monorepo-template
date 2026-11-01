import { createContext, createSignal, type ParentProps, useContext } from 'solid-js'

function createPalette() {
  const [open, setOpen] = createSignal(false)
  return { open, setOpen, toggle: () => setOpen(!open()) }
}

type PaletteState = ReturnType<typeof createPalette>

const PaletteContext = createContext<PaletteState>()

/**
 * Whether the command palette is open, apart from the screens that show it and the shortcut that opens
 * it, which sit in different layers: the app listens for the keys, the shell draws the palette.
 */
export function PaletteProvider(props: ParentProps) {
  return <PaletteContext.Provider value={createPalette()}>{props.children}</PaletteContext.Provider>
}

export function usePalette(): PaletteState {
  const value = useContext(PaletteContext)
  if (!value) throw new Error('usePalette must be used inside a PaletteProvider')
  return value
}

/** The key a shortcut starts with: ⌘ on Apple devices, Ctrl elsewhere. */
export function modifierKey(platform: string): '⌘' | 'Ctrl' {
  return /^(Mac|iPhone|iPad|iPod)/.test(platform) ? '⌘' : 'Ctrl'
}
