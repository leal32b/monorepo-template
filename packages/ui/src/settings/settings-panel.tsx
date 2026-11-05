import { onMount, type ParentProps } from 'solid-js'

export type SettingsPanelProps = ParentProps<{
  /** What the panel is for, read out by screen readers: usually the label of the button that opened it. */
  label: string
}>

/**
 * The form a `SettingsRow` opens below itself (its `panel`): a group named for screen readers, given
 * focus when it opens, so the keyboard starts where the form does.
 */
export function SettingsPanel(props: SettingsPanelProps) {
  return (
    <fieldset
      tabIndex={-1}
      ref={(panel) => onMount(() => panel.focus())}
      class="m-0 flex min-w-0 flex-col gap-4 border-0 p-0 outline-none"
    >
      <legend class="sr-only">{props.label}</legend>
      {props.children}
    </fieldset>
  )
}
