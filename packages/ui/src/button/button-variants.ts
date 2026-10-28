import { cva, type VariantProps } from 'class-variance-authority'

/**
 * How a button looks. Every variant puts on its background a role pair the contrast test holds to
 * WCAG (`tokens.test.ts`). At most one `primary` per view, for the action the view is about, which is
 * why the default is `secondary`.
 */
export const buttonVariants = cva(
  [
    'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md border font-medium',
    'cursor-pointer select-none transition-colors',
    'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
    'disabled:cursor-not-allowed disabled:opacity-50'
  ],
  {
    variants: {
      variant: {
        primary: 'border-transparent bg-primary text-primary-foreground hover:bg-primary/90',
        secondary: 'border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80',
        outline: 'border-border bg-background text-foreground hover:bg-secondary',
        ghost: 'border-transparent bg-transparent text-foreground hover:bg-secondary',
        destructive: 'border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/90'
      },
      size: {
        sm: 'h-8 px-3 text-sm',
        md: 'h-9 px-4 text-sm',
        lg: 'h-10 px-6 text-base'
      }
    },
    defaultVariants: { variant: 'secondary', size: 'md' }
  }
)

export type ButtonVariantProps = VariantProps<typeof buttonVariants>
