import type { accountEn } from '../dictionaries/account/en'
import type { auditEn } from '../dictionaries/audit/en'
import type { billingEn } from '../dictionaries/billing/en'
import type { customersEn } from '../dictionaries/customers/en'
import { entryEn } from '../dictionaries/entry/en'
import type { legalEn } from '../dictionaries/legal/en'
import type { organizationsEn } from '../dictionaries/organizations/en'
import type { publicEn } from '../dictionaries/public/en'
import { shellEn } from '../dictionaries/shell/en'
import type { teamEn } from '../dictionaries/team/en'

/** The core groups: what the first download needs, a visitor's screens and the frame (ADR 0071). */
export const en = {
  ...shellEn,
  ...entryEn
}

/**
 * Every text there is, the core and the groups fetched with their screens: what `t` accepts. A group
 * fetched later adds a line here and one in `lazyGroups` (`messages.ts`).
 */
export type Messages = typeof en &
  typeof accountEn &
  typeof auditEn &
  typeof billingEn &
  typeof customersEn &
  typeof legalEn &
  typeof organizationsEn &
  typeof publicEn &
  typeof teamEn
