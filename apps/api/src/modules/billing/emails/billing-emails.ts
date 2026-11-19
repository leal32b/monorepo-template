import { gracePeriod } from '@repo/contracts'
import { defineEmails, type EmailOf } from '#libs/notifications/define-emails'
import { formatDay } from '#libs/notifications/format'
import type { OrganizationOwners } from '#modules/identity/index'
import { en } from './locales/en'
import { es } from './locales/es'
import { ptBR } from './locales/pt-BR'

/** The billing module's emails to the owner (ADR 0073), on their own job kind; nothing in them is a credential. */
export const billingEmails = defineEmails('billing.send-email', { en, es, 'pt-BR': ptBR })

type BillingEmail = EmailOf<Parameters<typeof billingEmails.write>[0]['email']>
type Owner = NonNullable<Awaited<ReturnType<OrganizationOwners['ownerOf']>>>

/** How many days before its end the trial is recalled (ADR 0073). */
export const trialReminder = { daysBefore: 3 } as const

const day = 24 * 60 * 60 * 1000

/** What every billing email says of the organization, and where its button goes: the plan page. */
function toOwner({ email, locale, organization }: Owner, webOrigin: string) {
  const dayOf = (instant: Date) => formatDay(instant, { locale, timeZone: organization.timeZone })
  const message = { to: email, locale, url: `${webOrigin}/${organization.slug}/settings/billing` }
  return { message, dayOf, organization: organization.name }
}

/** The trial ends in `trialReminder.daysBefore` days, on its day in the organization's calendar. */
export function trialEndingEmail(owner: Owner, trialEndsAt: Date, webOrigin: string): BillingEmail {
  const { message, dayOf, organization } = toOwner(owner, webOrigin)
  return {
    email: 'trialEnding',
    ...message,
    values: { organization, days: String(trialReminder.daysBefore), trialEnds: dayOf(trialEndsAt) }
  }
}

/**
 * The charge due on `pastDueSince` was not received; full access lasts the grace period (ADR 0063), so
 * the day to pay by is the one the screens show. A provider that gave no due date leaves nothing to say.
 */
export function paymentFailedEmail(owner: Owner, pastDueSince: Date | null, webOrigin: string): BillingEmail | null {
  if (pastDueSince === null) return null
  const { message, dayOf, organization } = toOwner(owner, webOrigin)
  const payBy = new Date(pastDueSince.getTime() + gracePeriod.days * day)
  return {
    email: 'paymentFailed',
    ...message,
    values: { organization, dueDay: dayOf(pastDueSince), payBy: dayOf(payBy) }
  }
}
