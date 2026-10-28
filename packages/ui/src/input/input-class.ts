/**
 * How a text input looks, alone (`Input`) or inside a `Field`. Text, placeholder and border are role
 * pairs the contrast test holds to WCAG; the invalid border follows `aria-invalid`, so what is seen
 * cannot drift from what a screen reader announces.
 */
export const inputClass = [
  'h-9 w-full rounded-md border border-border bg-background px-3 text-sm text-foreground',
  'placeholder:text-muted-foreground',
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
  'aria-[invalid=true]:border-destructive',
  'disabled:cursor-not-allowed disabled:opacity-50'
].join(' ')
