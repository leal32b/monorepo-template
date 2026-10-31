/**
 * How a text link looks: underlined, so it stands out from the text around it by more than its
 * colour (WCAG 1.4.1), in the text colour, a role pair the contrast test already holds to WCAG.
 */
export const linkClass = [
  'font-medium text-foreground underline underline-offset-4 hover:decoration-2',
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring'
].join(' ')
