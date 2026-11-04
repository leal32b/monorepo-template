import { type JSX, Show } from 'solid-js'
import { Button, type ButtonVariantProps } from '#button'
import type { Panels } from './panels'

export type PanelButtonProps<K extends string> = {
  panels: Panels<K>
  /** The panel it opens. */
  panel: K
  /** Called before the panel opens, to clear what the row said last. */
  onOpen?: (() => void) | undefined
  /** Keeps it from opening, for a reason the row says in its `note`. */
  disabled?: boolean | undefined
  variant?: ButtonVariantProps['variant']
  children: JSX.Element
}

/**
 * The button of a `SettingsRow` that opens one of its panels. It leaves while its panel is open, waits
 * while another one is, and gets focus back when its panel closes (`createPanels`).
 */
export function PanelButton<K extends string>(props: PanelButtonProps<K>) {
  return (
    <Show when={!props.panels.isOpen(props.panel)}>
      <Button
        ref={props.panels.opener(props.panel)}
        variant={props.variant}
        disabled={props.disabled || props.panels.busy()}
        onClick={() => {
          props.onOpen?.()
          props.panels.show(props.panel)
        }}
      >
        {props.children}
      </Button>
    </Show>
  )
}
