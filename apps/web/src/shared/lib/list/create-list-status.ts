import type { Panels } from '@repo/ui'
import { createSignal } from 'solid-js'

/**
 * What a list screen says about what the user just did, in the two places the design system gives it:
 * a line in the row acted on (`ListRow`'s `status`) and a line below the section (`ListSection`'s
 * `status`, which takes focus, so the keyboard does not fall to the page when a row goes away).
 *
 * One line of each kind at a time: starting something else (`forget`) clears both.
 */
export function createListStatus(panels: Pick<Panels, 'dismiss'>) {
  const [row, setRow] = createSignal<{ id: string; text: string }>()
  const [section, setSection] = createSignal<string>()

  return {
    /** What the row `id` says, if it is the row that spoke last: for `ListRow`'s `status`. */
    row: (id: string) => (row()?.id === id ? row()?.text : undefined),
    /** What the section says: for `ListSection`'s `status`. */
    section,
    /** The row `id` says `text`, such as "Ada was saved." */
    sayRow: (id: string, text: string) => setRow({ id, text }),
    /** The section says `text`, below its rows. */
    saySection: (text: string) => setSection(text),
    /**
     * A row left the list (archived, deleted, revoked, or already gone): the panel it had open goes
     * with it, and the section says so.
     */
    left: (text: string) => {
      panels.dismiss()
      setSection(text)
    },
    /** Clears both lines: a new action begins. Pass it to `PanelButton`'s `onOpen`. */
    forget: () => {
      setRow(undefined)
      setSection(undefined)
    }
  }
}
