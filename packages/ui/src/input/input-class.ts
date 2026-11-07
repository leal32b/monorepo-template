/**
 * How a text input looks, alone (`Input`) or inside a `Field`. Text, placeholder and border are role
 * pairs the contrast test holds to WCAG; the invalid border follows `aria-invalid`, so what is seen
 * cannot drift from what a screen reader announces. Mobile first: 44px tall with 16px text on phones
 * (a smaller text makes iOS zoom in on focus), compact from `sm` up. A read-only one sits on the surface.
 */
const inputBase = [
  'w-full rounded-md border border-border bg-background text-base text-foreground sm:text-sm',
  'placeholder:text-muted-foreground',
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
  'aria-[invalid=true]:border-destructive',
  // Read only (a `Field`'s, marked by Kobalte): a value that cannot change here, on the surface, so it does
  // not look like a place to type.
  'data-[readonly]:cursor-default data-[readonly]:border-border-subtle data-[readonly]:bg-surface',
  'disabled:cursor-not-allowed disabled:opacity-50'
].join(' ')

export const inputClass = `${inputBase} h-11 px-3 sm:h-9`

/** The same input with room on the right for a button inside it, such as the password toggle. */
export const inputWithActionClass = `${inputBase} h-11 pl-3 pr-11 sm:h-9 sm:pr-9`

/** The same for several lines: as wide as an input, at least three lines tall, taller when the user drags it. */
export const textAreaClass = `${inputBase} min-h-24 resize-y px-3 py-2`
