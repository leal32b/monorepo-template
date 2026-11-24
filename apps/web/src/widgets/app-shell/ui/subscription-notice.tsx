import type { Subscription } from '@repo/contracts'
import { Alert, buttonVariants } from '@repo/ui'
import { A } from '@solidjs/router'
import { createMemo, Show } from 'solid-js'
import { useI18n } from '#shared/config'
import { formatDate } from '#shared/lib'
import { type Notice, type NoticeAction, noticeOf } from '../model/subscription-notice'

export type SubscriptionNoticeProps = {
  subscription: Subscription
  /** Whether the reader manages the plan (`billing:manage`): the owner, told what to do and given the way. */
  manages: boolean
  /** The organization's time zone (ADR 0053): the dates are the days they are there. */
  timeZone: string
  /** The plan page, where the owner's action leads. */
  plansHref: string
}

/**
 * The subscription's state in one `Alert` (ADR 0063): a trial ending or ended, a scheduled end, a late
 * payment, a plan that ended, in the words for the owner or for another member, its dates in the
 * organization's time zone. The owner's action leads to the plan page; nothing is drawn for a state with
 * nothing to say. It is the frame's, drawn by `AppShell` on every screen of an organization, and lives with
 * the frame rather than the subscriptions entity, so the first screen does not load the plan page's code.
 */
export function SubscriptionNotice(props: SubscriptionNoticeProps) {
  const { t, locale } = useI18n()
  const notice = createMemo(() => noticeOf(props.subscription, { manages: props.manages, now: new Date() }))
  const day = (date: Date | undefined) => (date === undefined ? '' : formatDate(date, locale(), props.timeZone))
  const text = (said: Notice) =>
    t(`subscription.notice.${said.audience}.${said.key}`, {
      date: day(said.dates.date),
      due: day(said.dates.due),
      until: day(said.dates.until)
    })

  return (
    <Show when={notice()}>
      {(said) => (
        <Alert
          variant={said().variant}
          // The link itself or nothing: the alert keeps a place for whatever it is handed.
          action={
            said().action !== undefined ? (
              <A href={props.plansHref} class={buttonVariants({ variant: 'secondary' })}>
                {t(`subscription.actions.${said().action as NoticeAction}`)}
              </A>
            ) : undefined
          }
        >
          {text(said())}
        </Alert>
      )}
    </Show>
  )
}
