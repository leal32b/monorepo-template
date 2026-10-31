import { type ComponentProps, type JSX, Show, splitProps } from 'solid-js'
import { cn } from '#libs'
import { type AlertVariantProps, alertTitleVariants, alertVariants } from './alert-variants'

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
 * Tells the user what happened. An error is announced at once (`role="alert"`), anything else
 * politely (`role="status"`). Every text comes from the app; a passed `class` goes on the box, and
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
      <Show when={local.title}>
        <p class={alertTitleVariants({ variant: local.variant })}>{local.title}</p>
      </Show>
      <div>{local.children}</div>
      <Show when={local.reference}>
        <p class="text-sm text-muted-foreground">{local.reference}</p>
      </Show>
      <Show when={local.action}>
        <div class="mt-2">{local.action}</div>
      </Show>
    </div>
  )
}
