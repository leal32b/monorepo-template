import {
  type Capability,
  capabilities,
  limits,
  type Money,
  type PlanKey,
  plans,
  type Subscription
} from '@repo/contracts'
import { useI18n } from '#shared/config'
import { formatDate, formatDays, formatMoney } from '#shared/lib'
import { standingOf } from './standing'

const planKeys = Object.keys(plans) as PlanKey[]

/**
 * The catalogue in words (ADR 0063): a plan's name, its price a month, what it includes, and where the
 * subscription stands. Entitlements are said in words, never by their keys; a product's catalogue writes
 * its words in the billing dictionary.
 */
export function usePlanWords() {
  const { t, locale } = useI18n()
  const money = (amount: Money) => formatMoney(amount, locale())
  const price = (plan: PlanKey) => t('billing.price', { price: money(plans[plan].price) })

  return {
    money,
    /** The plan's name; the trial while no plan is paid for. */
    name: (plan: PlanKey | null) => (plan === null ? t('subscription.trial') : t(`subscription.plans.${plan}`)),
    price,
    /** Each limit with its number, or none, then each capability the plan grants. */
    includes: (plan: PlanKey): string[] => {
      const { entitlements } = plans[plan]
      const held = entitlements.capabilities as readonly Capability[]
      return [
        ...limits.map((limit) => {
          const count = entitlements.limits[limit]
          return count === null
            ? t(`billing.limits.${limit}.none`)
            : t(`billing.limits.${limit}.some`, { count: new Intl.NumberFormat(locale()).format(count) })
        }),
        ...capabilities
          .filter((capability) => held.includes(capability))
          .map((capability) => t(`billing.capabilities.${capability}`))
      ]
    },
    /** The plans that grant a capability, as a list in the language ("Pro", "Pro or Max"). */
    plansWith: (capability: Capability) =>
      new Intl.ListFormat(locale(), { type: 'disjunction' }).format(
        planKeys
          .filter((plan) => (plans[plan].entitlements.capabilities as readonly Capability[]).includes(capability))
          .map((plan) => t(`subscription.plans.${plan}`))
      ),
    /** Where the subscription stands, in one line, its dates the days they are in the organization's time zone. */
    standing: (subscription: Subscription, timeZone: string) => {
      const standing = standingOf(subscription, new Date())
      const day = (date: Date | undefined) => (date === undefined ? '' : formatDate(date, locale(), timeZone))
      return t(`billing.current.${standing.line}`, {
        date: day(standing.dates.date),
        due: day(standing.dates.due),
        days: formatDays(standing.days ?? 0, locale()),
        price: subscription.plan === null ? '' : price(subscription.plan)
      })
    }
  }
}
