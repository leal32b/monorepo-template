import { sendJson } from '#libs/http/json'
import type { HttpHandler } from '#libs/http/router'
import type { CurrentSession, Membership } from '#modules/identity/index'
import { requireMember } from '#modules/identity/index'
import type { GetCustomerService } from './get-customer.service'

/** `GET /api/organizations/:organizationId/customers/:customerId` */
export class GetCustomerController {
  constructor(
    private readonly session: CurrentSession,
    private readonly membership: Membership,
    private readonly service: GetCustomerService
  ) {}

  readonly handle: HttpHandler = async (req, res, { params }) => {
    const organizationId = params.organizationId as string
    await requireMember({ session: this.session, membership: this.membership }, req, organizationId, {
      customer: ['read']
    })
    sendJson(res, 200, await this.service.execute(organizationId, params.customerId as string))
  }
}
