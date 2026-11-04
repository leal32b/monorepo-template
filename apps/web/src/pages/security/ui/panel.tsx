/** Which row's form is open. One at a time, so what the user is doing is always the one thing open. */
export type PanelName = 'password' | 'turn-on' | 'turn-off' | 'new-codes'

/** What every row needs to open and close its form. */
export type RowPanelProps = {
  /** The form that is open, if any. */
  open: PanelName | undefined
  onOpen: (panel: PanelName) => void
  onClose: () => void
}
