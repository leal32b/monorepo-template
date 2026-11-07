import type { HttpHandler } from '#libs/http/router'
import type { CurrentSession, Membership } from '#modules/identity/index'
import { requireMember } from '#modules/identity/index'
import type { DeleteCustomerService } from './delete-customer.service'

/** `DELETE /api/organizations/:organizationId/customers/:customerId`: 204, once the customer is archived. */
export class DeleteCustomerController {
  constructor(
    private readonly session: CurrentSession,
    private readonly membership: Membership,
    private readonly service: DeleteCustomerService
  ) {}

  readonly handle: HttpHandler = async (req, res, { params }) => {
    const organizationId = params.organizationId as string
    await requireMember({ session: this.session, membership: this.membership }, req, organizationId, {
      customer: ['delete']
    })
    await this.service.execute(organizationId, params.customerId as string)
    res.writeHead(204).end()
  }
}
