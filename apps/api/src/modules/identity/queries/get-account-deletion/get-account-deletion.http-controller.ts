import type { AccountDeletion } from '@repo/contracts'
import { sendJson } from '#libs/http/json'
import type { HttpHandler } from '#libs/http/router'
import type { AccountDeletionPlan } from '#modules/identity/account-deletion.port'
import type { CurrentSession } from '#modules/identity/current-session.port'
import { requireActor } from '#modules/identity/require-actor'

/**
 * `GET /api/me/account-deletion`: what deleting the signed-in user's account would do to each of their
 * organizations (ADR 0049), so the screen says it before anything happens. A read: it deletes nothing.
 */
export class GetAccountDeletionController {
  constructor(
    private readonly session: CurrentSession,
    private readonly plan: AccountDeletionPlan
  ) {}

  readonly handle: HttpHandler = async (req, res) => {
    const { userId } = await requireActor(this.session, req)
    sendJson(res, 200, { organizations: await this.plan.organizationsOf(userId) } satisfies AccountDeletion)
  }
}
