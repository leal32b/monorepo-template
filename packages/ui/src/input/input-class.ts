/**
 * How a text input looks, alone (`Input`) or inside a `Field`. Text, placeholder and border are role
 * pairs the contrast test holds to WCAG; the invalid border follows `aria-invalid`, so what is seen
 * cannot drift from what a screen reader announces. Mobile first: 44px tall with 16px text on phones
 * (a smaller text makes iOS zoom in on focus), compact from `sm` up. A read-only one sits on the surface.
 */
const inputBase = [
  'h-11 w-full rounded-md border border-border bg-background text-base text-foreground sm:h-9 sm:text-sm',
  'placeholder:text-muted-foreground',
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
  'aria-[invalid=true]:border-destructive',
  // Read only (a `Field`'s, marked by Kobalte): a value that cannot change here, on the surface, so it does
  // not look like a place to type.
  'data-[readonly]:cursor-default data-[readonly]:border-border-subtle data-[readonly]:bg-surface',
  'disabled:cursor-not-allowed disabled:opacity-50'
].join(' ')

export const inputClass = `${inputBase} px-3`

/** The same input with room on the right for a button inside it, such as the password toggle. */
export const inputWithActionClass = `${inputBase} pl-3 pr-11 sm:pr-9`
