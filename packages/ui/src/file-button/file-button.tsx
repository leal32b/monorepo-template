import { type JSX, splitProps } from 'solid-js'
import { Button, type ButtonProps } from '#button'

export type FileButtonProps = Omit<ButtonProps, 'onClick' | 'onSelect' | 'type'> & {
  /** The types the picker offers, as `<input accept>` takes them: `image/png,image/jpeg`. */
  accept: string
  /** The file chosen; nothing when the picker is closed without one. */
  onSelect: (file: File) => void
  children: JSX.Element
}

/**
 * A button that opens the device's file picker and hands over the file chosen. The button is the control
 * people and screen readers reach; the file input behind it is hidden from both, and emptied after each
 * choice, so choosing the same file again is a choice too.
 */
export function FileButton(props: FileButtonProps) {
  const [local, rest] = splitProps(props, ['accept', 'onSelect', 'children'])
  let input: HTMLInputElement | undefined

  return (
    <>
      <Button {...rest} onClick={() => input?.click()}>
        {local.children}
      </Button>
      <input
        ref={(element) => {
          input = element
        }}
        type="file"
        accept={local.accept}
        class="sr-only"
        tabIndex={-1}
        aria-hidden="true"
        onChange={(event) => {
          const file = event.currentTarget.files?.[0]
          event.currentTarget.value = ''
          if (file !== undefined) local.onSelect(file)
        }}
      />
    </>
  )
}
