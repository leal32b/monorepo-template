import { type Billing, type CheckoutKind, gracePeriod, type PlanKey, plans, type Subscription } from '@repo/contracts'
import { Alert, buttonVariants, createPanels, ListPanel, ListRow, ListSection, PanelButton } from '@repo/ui'
import { useSearchParams } from '@solidjs/router'
import { createSignal, For, Show } from 'solid-js'
import { holdersOf, membersQuery, useOrganization } from '#entities/organizations'
import { billingQuery, choiceOf, type PlanChoice, plansPath, usePlanWords } from '#entities/subscriptions'
import {
  BillingFailureAlert,
  CancelPlanForm,
  CheckoutForm,
  DowngradeForm,
  PayNowButton,
  PlanActionButton
} from '#features/billing/manage-plan'
import { type AuthFailure, createRead, readAgain, useApi, useAuth } from '#shared/api'
import { useI18n } from '#shared/config'
import { formatDate, formatDays } from '#shared/lib'
import { ReadFailure } from '#shared/ui'
import { AppShell } from '#widgets/app-shell'
import { type Arrival, type Came, createArrival } from '../model/arrival'
import { CatalogueRow, CurrentPlanRow, isCurrentPlan, planKeys } from './plan-rows'

/**
 * `/:orgSlug/settings/billing`, "Plan and billing" (ADR 0063, ADR 0067). The owner, who alone holds
 * `billing:manage`, sees the plan and where it stands, what is open (a payment, a downgrade, an end, a
 * late payment) with the way to act on it, the catalogue with what each choice costs and from when, and
 * cancelling the plan. Every other member sees the plan, what each plan includes and who manages it: the
 * plan decides what they can do. A form opens inline below its row, one at a time.
 */
export function OrganizationBillingPage() {
  const { t } = useI18n()
  const current = useOrganization()

  return (
    <AppShell title={t('billing.title')}>
      <ReadFailure message={t('billing.unavailable')}>
        <Show when={current.can('billing', 'manage')} fallback={<MemberPlan />}>
          <OwnerPlan />
        </Show>
      </ReadFailure>
    </AppShell>
  )
}

/** The choices that open a panel in the catalogue: the others are the plan paid for, scheduled, open or held. */
const choosable = (choice: PlanChoice) =>
  choice.kind === 'subscribe' ||
  choice.kind === 'upgrade' ||
  choice.kind === 'freeUpgrade' ||
  choice.kind === 'downgrade'

function OwnerPlan() {
  const { t, locale } = useI18n()
  const api = useApi()
  const current = useOrganization()
  const words = usePlanWords()
  const id = current.organization.id
  const read = billingQuery(api)
  const billing = createRead(() => read(id), read.keyFor(id))
  const panels = createPanels<'cancel' | 'pay' | PlanKey>()
  const [planStatus, setPlanStatus] = createSignal<string>()
  const [catalogueStatus, setCatalogueStatus] = createSignal<string>()
  const [planFailure, setPlanFailure] = createSignal<AuthFailure>()
  const [catalogueFailure, setCatalogueFailure] = createSignal<AuthFailure>()

  const returnTo = () => plansPath(current.organization.slug)
  const day = (date: Date | string) => formatDate(new Date(date), locale(), current.organization.timeZone)
  const name = (plan: PlanKey | null) => words.name(plan)
  const forget = () => {
    setPlanStatus(undefined)
    setCatalogueStatus(undefined)
    setPlanFailure(undefined)
    setCatalogueFailure(undefined)
  }
  /** The subscription changed: the page reads it again, and so does the frame, whose notice draws from the membership. */
  const again = () => {
    readAgain(read.keyFor(id))
    current.refresh().catch(() => undefined)
  }
  /** Something changed: said in the section, the panel closed, and everything read again. */
  const changed = (say: (text: string) => void, text: string) => {
    say(text)
    panels.close()
    again()
  }
  /** A refusal of the subscription as the page read it (a 409): said below the section, and read again. */
  const stale = (say: (failure: AuthFailure) => void) => (failure: AuthFailure) => {
    panels.dismiss()
    say(failure)
    again()
  }

  // Read once: the address loses it at once, so a reload or a link shared starts clean.
  const [search, setSearch] = useSearchParams<{ checkout?: string }>()
  const came = (search.checkout === 'returned' || search.checkout === 'cancelled' ? search.checkout : undefined) as Came
  if (search.checkout !== undefined) setSearch({ checkout: undefined }, { replace: true })
  const arrival = createArrival(came, billing, { readAgain: () => readAgain(read.keyFor(id)), confirmed: again })

  return (
    <Show when={billing()}>
      {(loaded: () => Billing) => {
        const subscription = () => loaded().subscription
        const paidThrough = () => subscription().paidThrough as string
        const canCancel = () =>
          (subscription().status === 'active' || subscription().status === 'past_due') &&
          !subscription().cancelAtPeriodEnd
        const choice = (plan: PlanKey) =>
          choiceOf(subscription(), plan, { now: new Date(), minimumCharge: loaded().minimumCharge })

        return (
          <div class="flex flex-col gap-6">
            <Show when={arrival()}>
              {(said) => (
                <Alert variant={said().kind === 'confirmed' ? 'success' : 'info'}>{arrivalText(said())}</Alert>
              )}
            </Show>
            <ListSection
              title={t('billing.current.title')}
              description={t('billing.current.description', { name: current.organization.name })}
              status={planStatus()}
            >
              <CurrentPlanRow subscription={subscription()} timeZone={current.organization.timeZone} />
              <Show when={subscription().checkout}>
                {(checkout) => (
                  <ListRow
                    icon="clock"
                    title={t(`billing.checkout.${checkout().kind}`, { plan: name(checkout().plan) })}
                    description={t('billing.checkout.waiting', {
                      amount: words.money(checkout().amount),
                      plan: name(checkout().plan)
                    })}
                    action={
                      <>
                        <Show when={loaded().checkoutUrl}>
                          {(url) => (
                            <a href={url()} class={buttonVariants({ variant: 'secondary' })}>
                              {t('billing.actions.open')}
                            </a>
                          )}
                        </Show>
                        <PlanActionButton
                          organizationId={id}
                          action={{ kind: 'abandon', checkout: checkout().kind }}
                          version={loaded().version}
                          disabled={panels.busy()}
                          onDone={() =>
                            changed(setPlanStatus, abandonedText(checkout().kind, checkout().plan, subscription().plan))
                          }
                          onFailed={(failure) => failed(failure)}
                        />
                      </>
                    }
                  />
                )}
              </Show>
              <Show when={subscription().nextPlan}>
                {(next) => (
                  <ListRow
                    icon="clock"
                    title={t('billing.downgrade.title', { plan: name(next()), date: day(paidThrough()) })}
                    description={t('billing.downgrade.description', { current: name(subscription().plan) })}
                    action={
                      <PlanActionButton
                        organizationId={id}
                        action={{ kind: 'keep', plan: subscription().plan as PlanKey }}
                        version={loaded().version}
                        disabled={panels.busy()}
                        onDone={() =>
                          changed(setPlanStatus, t('billing.downgrade.kept', { plan: name(subscription().plan) }))
                        }
                        onFailed={(failure) => failed(failure)}
                      />
                    }
                  />
                )}
              </Show>
              <Show
                when={
                  subscription().status === 'active' &&
                  subscription().cancelAtPeriodEnd &&
                  subscription().access === 'full'
                }
              >
                <ListRow
                  icon="clock"
                  title={t('billing.end.title', { date: day(paidThrough()) })}
                  description={t('billing.end.description')}
                  action={
                    <PlanActionButton
                      organizationId={id}
                      action={{ kind: 'resume' }}
                      version={loaded().version}
                      disabled={panels.busy()}
                      onDone={() => changed(setPlanStatus, t('billing.end.kept'))}
                      onFailed={(failure) => failed(failure)}
                    />
                  }
                />
              </Show>
              <Show when={subscription().status === 'past_due' && subscription().pastDueSince} keyed>
                {(since) => {
                  const until = () => day(new Date(new Date(since).getTime() + gracePeriodMs))
                  return (
                    <ListRow
                      icon="warning"
                      title={t('billing.late.title')}
                      description={t(
                        subscription().access === 'read-only' ? 'billing.late.readOnly' : 'billing.late.pastDue',
                        { until: until() }
                      )}
                      action={
                        <Show when={!panels.isOpen('pay')}>
                          <PayNowButton
                            ref={panels.opener('pay')}
                            organizationId={id}
                            disabled={panels.busy()}
                            onNoPage={() => {
                              forget()
                              panels.show('pay')
                            }}
                            onFailed={(failure) => failed(failure)}
                          />
                        </Show>
                      }
                      panel={
                        <Show when={panels.isOpen('pay')}>
                          <ListPanel label={t('billing.actions.pay')}>
                            <CheckoutForm
                              organizationId={id}
                              plan={subscription().plan as PlanKey}
                              version={loaded().version}
                              returnTo={returnTo()}
                              message={t('billing.late.checkout', {
                                plan: name(subscription().plan),
                                price: words.money(plans[subscription().plan as PlanKey].price)
                              })}
                              onChanged={again}
                              onStale={stale(setPlanFailure)}
                              onCancel={panels.close}
                            />
                          </ListPanel>
                        </Show>
                      }
                    />
                  )
                }}
              </Show>
              <Show when={canCancel()}>
                <ListRow
                  icon="close"
                  title={t('billing.cancel.action')}
                  description={t('billing.cancel.description')}
                  action={
                    <PanelButton panels={panels} panel="cancel" onOpen={forget}>
                      {t('billing.cancel.action')}
                    </PanelButton>
                  }
                  panel={
                    <Show when={panels.isOpen('cancel')}>
                      <ListPanel label={t('billing.cancel.action')}>
                        <CancelPlanForm
                          organizationId={id}
                          version={loaded().version}
                          message={
                            new Date(paidThrough()) > new Date()
                              ? t('billing.cancel.message', { date: day(paidThrough()) })
                              : t('billing.cancel.messageUndated')
                          }
                          onChanged={() => changed(setPlanStatus, t('billing.cancel.done'))}
                          onStale={stale(setPlanFailure)}
                          onCancel={panels.close}
                        />
                      </ListPanel>
                    </Show>
                  }
                />
              </Show>
              <Show when={loaded().reference}>
                {(reference) => <ListRow icon="help" title={t('billing.reference')} description={reference()} />}
              </Show>
            </ListSection>
            <Show when={planFailure()}>{(failure) => <BillingFailureAlert failure={failure()} />}</Show>
            <ListSection
              title={t('billing.catalogue.title')}
              description={t('billing.catalogue.description', { name: current.organization.name })}
              status={catalogueStatus()}
            >
              <For each={planKeys}>
                {(plan) => (
                  <CatalogueRow
                    plan={plan}
                    current={isCurrentPlan(subscription(), plan)}
                    note={(() => {
                      const chosen = choice(plan)
                      return chosen.kind === 'blocked' ? t(`billing.catalogue.notes.${chosen.reason}`) : undefined
                    })()}
                    action={
                      <Show when={choosable(choice(plan)) || choice(plan).kind === 'blocked'}>
                        <PanelButton
                          panels={panels}
                          panel={plan}
                          disabled={choice(plan).kind === 'blocked'}
                          onOpen={forget}
                        >
                          {t('billing.catalogue.choose', { plan: name(plan) })}
                        </PanelButton>
                      </Show>
                    }
                    panel={
                      <Show when={panels.isOpen(plan)}>
                        <ListPanel label={t('billing.catalogue.choose', { plan: name(plan) })}>
                          <ChoosePlan
                            plan={plan}
                            choice={choice(plan)}
                            billing={loaded()}
                            returnTo={returnTo()}
                            onChanged={(text) => changed(setCatalogueStatus, text)}
                            onStale={stale(setCatalogueFailure)}
                            onCancel={panels.close}
                          />
                        </ListPanel>
                      </Show>
                    }
                  />
                )}
              </For>
            </ListSection>
            <Show when={catalogueFailure()}>{(failure) => <BillingFailureAlert failure={failure()} />}</Show>
          </div>
        )
      }}
    </Show>
  )

  /** A one-press action refused: said below its section, and read again when the subscription is not as read. */
  function failed(failure: AuthFailure) {
    setPlanStatus(undefined)
    setPlanFailure(failure)
    if (failure.status === 409) again()
  }

  /** "The upgrade to Pro was cancelled. You are still on Basic, and nothing was charged." */
  function abandonedText(kind: CheckoutKind, plan: PlanKey, now: PlanKey | null) {
    return t(`billing.checkout.cancelled.${kind}`, { plan: name(plan), current: name(now) })
  }

  /** What the way back says: waiting, confirmed, a minute gone, gone unpaid, or the provider's page left. */
  function arrivalText(said: Arrival) {
    switch (said.kind) {
      case 'cancelled':
        return t('billing.returned.cancelled')
      case 'confirmed':
        return t('billing.returned.confirmed', { plan: name(said.plan) })
      case 'waiting':
        return t('billing.returned.waiting')
      case 'late':
        return t('billing.returned.late', { plan: name(said.checkout.plan) })
      case 'notPaid':
        return t(`billing.returned.notPaid.${said.checkout.kind}`, {
          plan: name(said.checkout.plan),
          current: name(said.plan)
        })
    }
  }
}

/** How long a late payment keeps full access (ADR 0063). */
const gracePeriodMs = gracePeriod.days * 24 * 60 * 60 * 1000

/**
 * The panel of a plan chosen in the catalogue: what choosing it costs and from when, then the checkout,
 * or the downgrade's confirmation. Its choice is taken as the panel opens, so a read meanwhile does not
 * reshape a form being filled.
 */
function ChoosePlan(props: {
  plan: PlanKey
  choice: PlanChoice
  billing: Billing
  returnTo: string
  onChanged: (text: string) => void
  onStale: (failure: AuthFailure) => void
  onCancel: () => void
}) {
  const { t, locale } = useI18n()
  const current = useOrganization()
  const words = usePlanWords()
  const choice = props.choice
  const subscription: Subscription = props.billing.subscription
  const day = (date: Date) => formatDate(date, locale(), current.organization.timeZone)
  const plan = words.name(props.plan)
  const price = words.money(plans[props.plan].price)
  const checkout = (message: string, free = false) => (
    <CheckoutForm
      organizationId={current.organization.id}
      plan={props.plan}
      version={props.billing.version}
      returnTo={props.returnTo}
      message={message}
      free={free}
      onChanged={() => props.onChanged(t('billing.catalogue.changed', { plan }))}
      onStale={props.onStale}
      onCancel={props.onCancel}
    />
  )

  switch (choice.kind) {
    case 'upgrade':
      return checkout(
        t('billing.catalogue.upgrade', {
          amount: words.money(choice.amount),
          days: formatDays(choice.days, locale()),
          date: day(choice.from),
          price,
          plan
        })
      )
    case 'freeUpgrade':
      return checkout(
        t('billing.catalogue.freeUpgrade', {
          plan,
          days: formatDays(choice.days, locale()),
          date: day(choice.from),
          price
        }),
        true
      )
    case 'downgrade':
      return (
        <DowngradeForm
          organizationId={current.organization.id}
          plan={props.plan}
          version={props.billing.version}
          message={t('billing.catalogue.downgrade', {
            plan,
            date: day(choice.from),
            current: words.name(subscription.plan)
          })}
          onChanged={() => props.onChanged(t('billing.catalogue.scheduled', { plan, date: day(choice.from) }))}
          onStale={props.onStale}
          onCancel={props.onCancel}
        />
      )
    default:
      return checkout(t('billing.catalogue.subscribe', { price, plan }))
  }
}

/**
 * What another member sees: the plan, what each plan includes, and who manages it (ADR 0063, "Permission":
 * a member who cannot manage it reads that its owner does). The owners' names come from the members list,
 * which every member may read; when it cannot be read, an owner is named by the role.
 */
function MemberPlan() {
  const { t, locale } = useI18n()
  const auth = useAuth()
  const current = useOrganization()
  const id = current.organization.id
  const read = membersQuery(auth)
  const members = createRead(() => read(id).catch(() => []), read.keyFor(id))
  const managers = () => {
    const owners = holdersOf('owner', members() ?? [], []).members.map((member) => member.name)
    return owners.length > 0
      ? new Intl.ListFormat(locale(), { type: 'conjunction' }).format(owners)
      : t('billing.managers.unknown', { name: current.organization.name })
  }
  const subscription = () => current.membership.subscription

  return (
    <div class="flex flex-col gap-6">
      <ListSection
        title={t('billing.current.memberTitle', { name: current.organization.name })}
        description={t('billing.current.memberDescription', { name: current.organization.name })}
      >
        <CurrentPlanRow subscription={subscription()} timeZone={current.organization.timeZone} />
        <ListRow icon="users" title={t('billing.managers.title')} description={managers()} />
      </ListSection>
      <ListSection title={t('billing.catalogue.title')} description={t('billing.catalogue.memberDescription')}>
        <For each={planKeys}>
          {(plan) => <CatalogueRow plan={plan} current={isCurrentPlan(subscription(), plan)} />}
        </For>
      </ListSection>
    </div>
  )
}
