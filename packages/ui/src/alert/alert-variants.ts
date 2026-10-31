import { cva, type VariantProps } from 'class-variance-authority'

/**
 * How an alert looks: a quiet bordered box on the page background, so it reads as part of the
 * screen. Only the border and the title change with the variant; every pair is one the contrast test
 * holds to WCAG (`tokens.test.ts`).
 */
export const alertVariants = cva(
  'flex flex-col gap-1 rounded-md border bg-background p-4 text-base text-foreground sm:text-sm',
  {
    variants: {
      variant: {
        info: 'border-border',
        error: 'border-destructive'
      }
    },
    defaultVariants: { variant: 'info' }
  }
)

export const alertTitleVariants = cva('font-medium', {
  variants: {
    variant: {
      info: '',
      error: 'text-destructive'
    }
  },
  defaultVariants: { variant: 'info' }
})

export type AlertVariantProps = VariantProps<typeof alertVariants>
