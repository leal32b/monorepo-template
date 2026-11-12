import { listAuditEntriesQuerySchema } from '@repo/contracts'
import { sendJson } from '#libs/http/json'
import { HttpProblem } from '#libs/http/problem'
import { readValidQuery } from '#libs/http/query'
import type { HttpHandler } from '#libs/http/router'
import type { CurrentSession, Membership } from '#modules/identity/index'
import { requireMember } from '#modules/identity/index'
import { decodeCursor } from '../../audit-cursor'
import type { ListAuditEntriesService } from './list-audit-entries.service'

/** `GET /api/organizations/:organizationId/audit-entries?before=`: a page of the trail, for `audit:read` (ADR 0061). */
export class ListAuditEntriesController {
  constructor(
    private readonly session: CurrentSession,
    private readonly membership: Membership,
    private readonly service: ListAuditEntriesService
  ) {}

  readonly handle: HttpHandler = async (req, res, { params }) => {
    const organizationId = params.organizationId as string
    await requireMember({ session: this.session, membership: this.membership }, req, organizationId, {
      audit: ['read']
    })
    const { before } = readValidQuery(req, listAuditEntriesQuerySchema)
    const cursor = before === undefined ? undefined : decodeCursor(before)
    if (cursor === null) {
      throw new HttpProblem(400, 'validation_failed', {
        detail: 'The query string does not match the expected shape.',
        errors: [{ path: 'before', message: 'Not a page of this trail.' }]
      })
    }
    sendJson(res, 200, await this.service.execute(organizationId, cursor))
  }
}
