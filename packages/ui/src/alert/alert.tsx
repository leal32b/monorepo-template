import { type ComponentProps, type JSX, Show, splitProps } from 'solid-js'
import { Icon, type IconName } from '#icon'
import { cn } from '#libs'
import { type AlertVariantProps, alertBarVariants, alertIconVariants, alertVariants } from './alert-variants'

/** Each kind has its own icon, so it is never told by colour alone. */
const iconOf: Record<NonNullable<AlertVariantProps['variant']>, IconName> = {
  info: 'info',
  error: 'error',
  success: 'success',
  warning: 'warning'
}

export type AlertProps = Omit<ComponentProps<'div'>, 'title'> &
  AlertVariantProps & {
    /** What happened, in a few words. */
    title?: string | undefined
    /** A reference the user can quote to support, such as an error code or a request id. */
    reference?: string | undefined
    /** What the user can do next: a button or a link. */
    action?: JSX.Element
    /** The message: what happened and what to do. */
    children: JSX.Element
  }

/**
 * Tells the user what happened: `info`, `success`, `warning` or `error`, each with its own icon and
 * colour. An error is announced at once (`role="alert"`), anything else politely (`role="status"`). Every text comes from the app; a passed `class` goes on the box, and
 * other attributes too, so the app can give it an `id` and move focus to it.
 */
export function Alert(props: AlertProps) {
  const [local, rest] = splitProps(props, ['class', 'variant', 'title', 'reference', 'action', 'children'])

  return (
    <div
      role={local.variant === 'error' ? 'alert' : 'status'}
      class={cn(alertVariants({ variant: local.variant }), local.class)}
      {...rest}
    >
      <span aria-hidden="true" class={alertBarVariants({ variant: local.variant })} />
      <Icon name={iconOf[local.variant ?? 'info']} class={alertIconVariants({ variant: local.variant })} />
      <div class="flex min-w-0 flex-1 flex-col gap-1">
        <Show when={local.title}>
          <p class="font-medium">{local.title}</p>
        </Show>
        <div>{local.children}</div>
        <Show when={local.reference}>
          <p class="text-sm text-muted-foreground">{local.reference}</p>
        </Show>
        <Show when={local.action}>
          <div class="mt-2">{local.action}</div>
        </Show>
      </div>
    </div>
  )
}
