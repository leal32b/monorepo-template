import { Icon, ListSkeleton } from '@repo/ui'
import { A, useLocation } from '@solidjs/router'
import { createMemo, onCleanup, onMount, type ParentProps, Show, Suspense } from 'solid-js'
import { homeOf, useCurrentOrganization } from '#entities/organizations'
import { useI18n } from '#shared/config'
import { AuthFailureAlert } from '#shared/ui'
import { settingsListOf } from '../model/settings-items'
import { useShell } from '../model/shell'
import { AppFrame } from './app-frame'
import { screenClass } from './screen-class'
import { SubscriptionNotice } from './subscription-notice'

export type AppShellProps = ParentProps<{
  /** The screen's only heading. */
  title: string
  /** What the screen is for, in one line under the title, for a screen that is one message and its actions. */
  description?: string | undefined
}>

/**
 * An app screen: its title and content in one column, mobile first, inside the frame the screens share
 * (`AppFrame`, ADR 0037), which it tells its organization while it is on view. Focus moves to
 * the title when the screen opens. On phones a setting draws the way back to its list above the title (ADR
 * 0080). Below the title, on an organization's screen, the subscription's state (ADR
 * 0063), drawn from the membership the screen already has, so it arrives with the screen and moves nothing
 * (the plan page says it in its own rows, ADR 0068);
 * then a failed sign-out. A screen with no frame around it, such as one drawn on its own in a test, draws one.
 *
 * What the screen reads waits under a boundary of its own (ADR 0038): moving to a screen never waits on its
 * data, so its title is drawn at once and its skeleton holds the content's place until the data is in.
 */
export function AppShell(props: AppShellProps) {
  const shell = useShell()
  if (shell === undefined) {
    return (
      <AppFrame>
        <AppShell title={props.title} description={props.description}>
          {props.children}
        </AppShell>
      </AppFrame>
    )
  }

  const { t } = useI18n()
  const current = useCurrentOrganization()
  const location = useLocation()
  // A memo keeps its last value once its screen has left, when the guard's context no longer can.
  const organization = createMemo(() => current?.organization)
  const logo = createMemo(() => current?.membership.logo)
  const subscription = createMemo(() => current?.membership.subscription)
  onCleanup(shell.enter({ organization, logo, subscription }))
  /** The plan page, where the notice's action leads; that page says the state in its own rows, so it draws none. */
  const plansHref = (here: NonNullable<typeof current>) =>
    // As the side menu writes it; the subscriptions entity's `plansPath` would load the plan page's code here.
    `${homeOf(here.organization)}/settings/billing`

  return (
    <main class={screenClass}>
      <div class="flex flex-col gap-2">
        <Show when={settingsListOf(location.pathname)}>
          {(list) => (
            // On phones the settings' own menu is a screen: each setting goes back to it (ADR 0080).
            <A
              href={list().href}
              class="-ml-1 flex w-fit items-center gap-1.5 rounded-md px-1 py-2 text-sm text-muted-foreground hover:text-foreground md:hidden"
            >
              <Icon name="back" />
              {t(`appShell.nav.${list().label}`)}
            </A>
          )}
        </Show>
        <h1
          ref={(heading) => onMount(() => heading.focus())}
          tabIndex={-1}
          class="text-2xl font-semibold tracking-tight outline-none"
        >
          {props.title}
        </h1>
        <Show when={props.description}>
          <p class="text-muted-foreground">{props.description}</p>
        </Show>
      </div>
      <Show when={current !== undefined && location.pathname !== plansHref(current) ? current : undefined}>
        {(here) => (
          <SubscriptionNotice
            subscription={here().membership.subscription}
            manages={here().can('billing', 'manage')}
            timeZone={here().organization.timeZone}
            plansHref={plansHref(here())}
          />
        )}
      </Show>
      <Show when={shell.signOutFailure()}>{(failure) => <AuthFailureAlert failure={failure()} />}</Show>
      <Suspense fallback={<ListSkeleton label={t('appShell.loading')} />}>{props.children}</Suspense>
    </main>
  )
}
