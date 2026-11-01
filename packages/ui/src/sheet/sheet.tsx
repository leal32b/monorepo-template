import { Dialog } from '@kobalte/core/dialog'
import type { JSX } from 'solid-js'
import { Icon } from '#icon'

export type SheetProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Names the sheet for screen readers, such as "Menu". Not shown. */
  title: string
  /** Names the close button, such as "Close menu". */
  closeLabel: string
  children: JSX.Element
}

/**
 * A panel that slides in from the left over the page: the side menu on phones. A modal dialog, so
 * focus stays inside while it is open, Escape or a tap on the shade closes it, and focus returns to
 * what opened it. The app decides when to show it (below the `md` breakpoint).
 */
export function Sheet(props: SheetProps) {
  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay class="fixed inset-0 z-40 bg-scrim/60" />
        <Dialog.Content class="fixed inset-y-0 left-0 z-50 flex w-72 max-w-[85vw] flex-col border-r border-border-subtle bg-surface outline-none">
          <Dialog.Title class="sr-only">{props.title}</Dialog.Title>
          <Dialog.CloseButton
            aria-label={props.closeLabel}
            class="absolute top-2 right-2 flex size-11 items-center justify-center rounded-md text-muted-foreground hover:bg-secondary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            <Icon name="close" />
          </Dialog.CloseButton>
          {props.children}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog>
  )
}
