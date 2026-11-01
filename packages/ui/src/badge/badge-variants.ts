import { cva, type VariantProps } from 'class-variance-authority'

/**
 * How a badge looks: a small outlined pill whose text carries the state. The colour only helps, the
 * word says it (WCAG 1.4.1); every text role is one the contrast test holds to 4.5:1 on `background`
 * and `surface`.
 */
export const badgeVariants = cva(
  'inline-flex h-6 items-center gap-1.5 whitespace-nowrap rounded-full border border-border-subtle px-2 text-xs font-medium',
  {
    variants: {
      variant: {
        neutral: 'text-muted-foreground',
        success: 'text-success',
        warning: 'text-warning',
        destructive: 'text-destructive'
      }
    },
    defaultVariants: { variant: 'neutral' }
  }
)

export type BadgeVariantProps = VariantProps<typeof badgeVariants>
