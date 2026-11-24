import {
  entitlement,
  type Limit,
  type OrganizationMembership,
  type Subscription,
  subscriptionProblems
} from '@repo/contracts'
import type { AuthFailure } from '#shared/api'
import { useI18n } from '#shared/config'
import { usePlanWords } from './plan-words'

/** What a refusal by the plan says, and whether the reader is offered the plans: the owner, unless an upgrade is on its way. */
export type PlanRefusal = { message: string; offerPlans: boolean }

/** Who reads it: the owner, who manages the plan, or another member; and the membership it comes from. */
type Reader = { membership: Pick<OrganizationMembership, 'subscription' | 'entitlements'>; manages: boolean }

/** The plan an upgrade on its way is for, if one is. */
const upgradingTo = (subscription: Subscription) =>
  subscription.checkout?.kind === 'upgrade' ? subscription.checkout.plan : undefined

/**
 * What a limit, or read only, means to the one who meets it (ADR 0063): to the owner, the plan's number and
 * what to do (a larger plan, or archiving), or that the upgrade on its way starts when it is paid; to another
 * member, how room is made and that an owner chooses the plan. The same words before an action (its row's
 * note) and after a refusal (its alert).
 */
export function usePlanRefusal() {
  const { t } = useI18n()
  const words = usePlanWords()

  const limitReached = (limit: Limit, count: number, { membership, manages }: Reader) => {
    const upgrading = upgradingTo(membership.subscription)
    const audience = !manages ? 'member' : upgrading !== undefined ? 'upgrading' : 'owner'
    return t(`subscription.limitReached.${limit}.${audience}`, {
      limit: count,
      plan: upgrading === undefined ? '' : words.name(upgrading)
    })
  }

  return {
    limitReached,
    /** The reason a write waits while the organization is read only, in its row's note. */
    readOnlyNote: () => t('subscription.readOnly.note'),
    /**
     * What a refused write says when the plan refused it: `plan_limit_reached` for `limit`, with the number
     * the API gave, or `subscription_read_only`; anything else is not the plan's.
     */
    of: (failure: AuthFailure, limit: Limit, reader: Reader): PlanRefusal | undefined => {
      if (failure.code === subscriptionProblems.limitReached) {
        const count = failure.limit ?? entitlement(reader.membership, limit) ?? 0
        return {
          message: limitReached(limit, count, reader),
          offerPlans: reader.manages && upgradingTo(reader.membership.subscription) === undefined
        }
      }
      if (failure.code === subscriptionProblems.readOnly) {
        return {
          message: t(`subscription.readOnly.${reader.manages ? 'owner' : 'member'}`),
          offerPlans: reader.manages
        }
      }
      return undefined
    }
  }
}
