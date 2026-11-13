import { type PlanKey, plans, type Subscription } from '@repo/contracts'
import { Badge, type BadgeProps, ListRow, type ListRowProps } from '@repo/ui'
import { standingOf, usePlanWords } from '#entities/subscriptions'
import { useI18n } from '#shared/config'

/** The plans of the catalogue, in its order. */
export const planKeys = Object.keys(plans) as PlanKey[]

/** A trial has no badge: its title already says it is one. */
const badgeVariants: Record<Exclude<ReturnType<typeof standingOf>['badge'], 'trial'>, BadgeProps['variant']> = {
  active: 'success',
  late: 'warning',
  readOnly: 'warning'
}

/** The plan the organization is on and where it stands, in the words of the plan page's first row. */
export function CurrentPlanRow(props: { subscription: Subscription; timeZone: string }) {
  const { t } = useI18n()
  const words = usePlanWords()
  const badge = () => standingOf(props.subscription, new Date()).badge

  return (
    <ListRow
      icon="billing"
      title={words.name(props.subscription.plan)}
      badge={(() => {
        const shown = badge()
        return shown === 'trial' ? undefined : (
          <Badge variant={badgeVariants[shown]} dot>
            {t(`billing.current.badges.${shown}`)}
          </Badge>
        )
      })()}
      description={words.standing(props.subscription, props.timeZone)}
    />
  )
}

/** Whether `plan` is the one paid for now, as the catalogue marks it. */
export const isCurrentPlan = (subscription: Subscription, plan: PlanKey) =>
  subscription.plan === plan && (subscription.status === 'active' || subscription.status === 'past_due')

/** A plan of the catalogue: its name, its price and what it includes, in words, and what can be done with it. */
export function CatalogueRow(
  props: { plan: PlanKey; current: boolean } & Pick<ListRowProps, 'action' | 'note' | 'panel'>
) {
  const { t } = useI18n()
  const words = usePlanWords()

  return (
    <ListRow
      icon="billing"
      title={words.name(props.plan)}
      badge={props.current ? <Badge>{t('billing.catalogue.current')}</Badge> : undefined}
      description={[words.price(props.plan), ...words.includes(props.plan)].join(' · ')}
      note={props.note}
      action={props.action}
      panel={props.panel}
    />
  )
}
