import { sendJson } from '#libs/http/json'
import type { HttpHandler } from '#libs/http/router'
import type { CurrentSession, Membership } from '#modules/identity/index'
import { requireMember } from '#modules/identity/index'
import type { RestoreCustomerService } from './restore-customer.service'

/** `POST /api/organizations/:organizationId/customers/:customerId/restore` */
export class RestoreCustomerController {
  constructor(
    private readonly session: CurrentSession,
    private readonly membership: Membership,
    private readonly service: RestoreCustomerService
  ) {}

  readonly handle: HttpHandler = async (req, res, { params }) => {
    const organizationId = params.organizationId as string
    const member = await requireMember({ session: this.session, membership: this.membership }, req, organizationId, {
      customer: ['update']
    })
    sendJson(
      res,
      200,
      await this.service.execute(organizationId, params.customerId as string, { kind: 'member', id: member.userId })
    )
  }
}
