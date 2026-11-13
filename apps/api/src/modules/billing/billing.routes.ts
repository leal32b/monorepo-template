import { billingCheckoutInputSchema, billingPlanInputSchema, billingVersionInputSchema } from '@repo/contracts'
import type { Logger } from 'pino'
import type { HttpRouter } from '#libs/http/router'
import type { BillingNotice, BillingProvider } from '#libs/ports/billing-provider.port'
import type { Clock } from '#libs/ports/clock.port'
import type { IdGenerator } from '#libs/ports/id-generator.port'
import type { WebhookInbox } from '#libs/ports/webhook-inbox.port'
import { webhookRoute } from '#libs/webhooks/webhook-route'
import { type TenantGuard, tenantRoutes } from '#modules/identity/index'
import type { BillingUnitOfWork } from './billing-unit-of-work.port'
import { AbandonCheckoutService } from './commands/abandon-checkout/abandon-checkout.service'
import { CancelSubscriptionService } from './commands/cancel-subscription/cancel-subscription.service'
import { ChangePlanService } from './commands/change-plan/change-plan.service'
import { ResumeSubscriptionService } from './commands/resume-subscription/resume-subscription.service'
import { StartCheckoutService } from './commands/start-checkout/start-checkout.service'
import { GetBillingService } from './queries/get-billing/get-billing.service'
import { GetPaymentPageService } from './queries/get-payment-page/get-payment-page.service'

export type BillingRoutesDeps = TenantGuard & {
  /** Every use case runs its database work inside it, confined to the organization (ADR 0055). */
  unitOfWork: BillingUnitOfWork
  provider: BillingProvider
  clock: Clock
  ids: IdGenerator
  /** The web app's origin (ADR 0019): the provider sends the owner back to a path of it. */
  webOrigin: string
  /** Where the provider's notices are taken in: their event ids recorded and their sync enqueued at once. */
  inbox: WebhookInbox<BillingNotice>
  logger: Logger
}

const base = '/api/organizations/:organizationId/billing'

/** The owner's alone (ADR 0063), and open while the organization is read only, so it can pay. */
const manage = { permission: { billing: ['manage'] }, duringReadOnly: true } as const

/**
 * The plan page's routes (ADR 0063, ADR 0065), for whoever holds `billing:manage`: the owner. A use
 * case is handed the trial's end from the membership read, for an organization that has no row yet.
 * Beside them, the configured provider's webhook, `POST /api/webhooks/<provider>`: no other name has a
 * route, so it answers 404.
 */
export function registerBillingRoutes(router: HttpRouter, deps: BillingRoutesDeps): void {
  const { unitOfWork, provider, clock, ids, webOrigin, inbox, logger } = deps
  const get = new GetBillingService(unitOfWork, provider, clock)
  const paymentPage = new GetPaymentPageService(unitOfWork, provider, clock)
  const checkout = new StartCheckoutService(unitOfWork, provider, clock, ids, webOrigin)
  const abandon = new AbandonCheckoutService(unitOfWork, provider, clock, ids)
  const changePlan = new ChangePlanService(unitOfWork, provider, clock, ids)
  const cancel = new CancelSubscriptionService({ unitOfWork, provider, clock, ids })
  const resume = new ResumeSubscriptionService({ unitOfWork, provider, clock, ids })

  const tenant = tenantRoutes(router, deps)
  tenant.get(base, manage, ({ organizationId, member }) => get.execute(organizationId, member.subscription.trialEndsAt))
  // Calls the provider: read only when the owner asks to pay, never with the page.
  tenant.get(`${base}/payment-page`, manage, ({ organizationId, member }) =>
    paymentPage.execute(organizationId, member.subscription.trialEndsAt)
  )
  tenant.post(
    `${base}/checkout`,
    { ...manage, input: billingCheckoutInputSchema },
    ({ organizationId, input, actor, member }) =>
      checkout.execute(organizationId, input, actor, member.subscription.trialEndsAt)
  )
  tenant.delete(`${base}/checkout`, manage, ({ organizationId, actor, member }) =>
    abandon.execute(organizationId, actor, member.subscription.trialEndsAt)
  )
  tenant.put(`${base}/plan`, { ...manage, input: billingPlanInputSchema }, ({ organizationId, input, actor, member }) =>
    changePlan.execute(organizationId, input, actor, member.subscription.trialEndsAt)
  )
  tenant.post(
    `${base}/cancel`,
    { ...manage, input: billingVersionInputSchema },
    ({ organizationId, input, actor, member }) =>
      cancel.execute(organizationId, input, actor, member.subscription.trialEndsAt)
  )
  tenant.post(
    `${base}/resume`,
    { ...manage, input: billingVersionInputSchema },
    ({ organizationId, input, actor, member }) =>
      resume.execute(organizationId, input, actor, member.subscription.trialEndsAt)
  )

  router.post(`/api/webhooks/${provider.name}`, webhookRoute(provider, inbox, logger))
}
