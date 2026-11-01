import { cva, type VariantProps } from 'class-variance-authority'

/**
 * How an alert looks: a raised box (`surface`) with a bar of its colour on the left and its icon in
 * the same colour, so it stands out from the page without shouting. The kind is never told by colour
 * alone: the icon differs, and the message says what happened. The colours are roles the contrast
 * test holds to WCAG (`tokens.test.ts`).
 */
export const alertVariants = cva(
  'relative flex gap-3 overflow-hidden rounded-md border border-border-subtle bg-surface py-4 pr-4 pl-5 text-base text-foreground sm:text-sm',
  {
    variants: {
      variant: { info: '', error: '', success: '', warning: '' }
    },
    defaultVariants: { variant: 'info' }
  }
)

/** The bar down the left edge. */
export const alertBarVariants = cva('absolute inset-y-0 left-0 w-1', {
  variants: {
    variant: { info: 'bg-primary', error: 'bg-destructive', success: 'bg-success', warning: 'bg-warning' }
  },
  defaultVariants: { variant: 'info' }
})

export const alertIconVariants = cva('mt-0.5 size-5 sm:size-4', {
  variants: {
    variant: { info: 'text-primary', error: 'text-destructive', success: 'text-success', warning: 'text-warning' }
  },
  defaultVariants: { variant: 'info' }
})

export type AlertVariantProps = VariantProps<typeof alertVariants>
