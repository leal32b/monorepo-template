import { splitProps } from 'solid-js'
import { Button } from '#button'
import { cn } from '#libs'

export type PagerProps = {
  /** Names the navigation for screen readers ("Customers pages"). */
  label: string
  previousLabel: string
  nextLabel: string
  /** Where the user is, in the caller's words and language ("Page 2 of 3"). */
  summary: string
  /** Whether there is a page before this one; the button stays, disabled, when there is not. */
  hasPrevious?: boolean | undefined
  hasNext?: boolean | undefined
  onPrevious: () => void
  onNext: () => void
  class?: string | undefined
}

/**
 * Previous, where you are, next: for a list read a page at a time. The buttons are always there and keep
 * one width, and the summary takes what is left and keeps its digits one width, so moving from page 9 to 10
 * or reaching an end moves nothing. The summary is announced politely as the page changes.
 */
export function Pager(props: PagerProps) {
  const [local] = splitProps(props, ['hasPrevious', 'hasNext'])

  return (
    <nav aria-label={props.label} class={cn('flex items-center justify-between gap-3', props.class)}>
      <Button variant="secondary" class="min-w-28" disabled={local.hasPrevious === false} onClick={props.onPrevious}>
        {props.previousLabel}
      </Button>
      <p role="status" class="min-w-0 flex-1 text-center text-sm text-muted-foreground tabular-nums">
        {props.summary}
      </p>
      <Button variant="secondary" class="min-w-28" disabled={local.hasNext === false} onClick={props.onNext}>
        {props.nextLabel}
      </Button>
    </nav>
  )
}
