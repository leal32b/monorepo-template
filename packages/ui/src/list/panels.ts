import { type Accessor, createSignal } from 'solid-js'

/** The panels of one screen: which is open, and the buttons that open them. */
export type Panels<K extends string = string> = {
  /** The panel that is open, if any. */
  open: Accessor<K | undefined>
  isOpen: (panel: K) => boolean
  /** Whether a panel is open: every other opener on the screen waits meanwhile. */
  busy: Accessor<boolean>
  show: (panel: K) => void
  /** Closes the panel and gives focus back to the button that opened it. */
  close: () => void
  /** Closes the panel when its row left the screen: focus goes where the screen says (a section's status). */
  dismiss: () => void
  /** The `ref` of the button that opens `panel`, so `close` can give it focus back. */
  opener: (panel: K) => (button: HTMLElement) => void
}

/**
 * One panel open at a time across a whole screen, so what the user is doing is always the one thing
 * open. Name each panel by what it is and whose it is (`role:${memberId}`). Use with `PanelButton`.
 */
export function createPanels<K extends string = string>(): Panels<K> {
  const [open, setOpen] = createSignal<K>()
  const openers = new Map<K, HTMLElement>()

  return {
    open,
    isOpen: (panel) => open() === panel,
    busy: () => open() !== undefined,
    show: (panel) => setOpen(() => panel),
    close: () => {
      const closed = open()
      setOpen(undefined)
      // The opener comes back on screen as the panel goes; once it is there, focus moves to it.
      queueMicrotask(() => {
        const button = openers.get(closed as K)
        if (button?.isConnected) button.focus()
      })
    },
    dismiss: () => setOpen(undefined),
    opener: (panel) => (button) => {
      openers.set(panel, button)
    }
  }
}
