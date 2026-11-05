import type { Panels } from '@repo/ui'

/** The forms of the security screen. One at a time, so what the user is doing is always the one thing open. */
export type PanelName = 'password' | 'authenticator' | 'new-codes'

/** What every row needs: the screen's panels (`createPanels`), shared so one opens at a time. */
export type RowPanelProps = {
  panels: Panels<PanelName>
}
