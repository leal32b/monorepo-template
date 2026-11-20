import type { IncomingMessage } from 'node:http'
import { type Capability, entitlement, type Permissions, subscriptionProblems } from '@repo/contracts'
import type * as z from 'zod/mini'
import { readValidJson } from '#libs/http/body'
import { FileRedirect, sendRedirect } from '#libs/http/file'
import { sendJson } from '#libs/http/json'
import { HttpProblem } from '#libs/http/problem'
import { readValidQuery } from '#libs/http/query'
import type { HttpHandler, HttpRouter } from '#libs/http/router'
import type { CurrentSession } from './current-session.port'
import type { Member, Membership } from './membership.port'
import { requireMember } from './require-member'

/** What the tenant guard reads: the session, then the membership (ADR 0033). */
export type TenantGuard = { session: CurrentSession; membership: Membership }

/** Every route scoped to a tenant names it first in its path (ADR 0033). */
type TenantPath = `/api/organizations/:organizationId/${string}`

/** The names of a path's parameters: `'/a/:b/c/:d'` gives `'b' | 'd'`. */
type ParamNames<Path extends string> = Path extends `${string}:${infer Name}/${infer Rest}`
  ? Name | ParamNames<Rest>
  : Path extends `${string}:${infer Name}`
    ? Name
    : never

type InputSchema = z.ZodMiniType | undefined

/** What a tenant route declares beside its path and its use case. */
export type TenantRouteSpec<Schema extends InputSchema> = {
  /** What the member's roles must hold; `{}` lets any member through (ADR 0033). */
  permission: Permissions
  /** The contract schema of the input: a `GET`'s query string, any other method's JSON body. Without it nothing is read. */
  input?: Schema
  /** The status of an answer with a body, 200 unless said; a use case that returns nothing answers 204. */
  status?: 200 | 201 | 202
  /** A capability the organization's plan must hold, or `403 plan_required` (ADR 0063). */
  entitlement?: Capability
  /** A `post` or `put` that serves billing, so the owner can pay while the organization is read only (ADR 0063). */
  duringReadOnly?: true
}

/** What the use case is handed: the organization the guard confirmed, the valid input, the path and who acts. */
export type TenantRequest<Path extends string, Schema extends InputSchema> = {
  organizationId: string
  input: Schema extends z.ZodMiniType ? z.output<Schema> : undefined
  params: Record<ParamNames<Path>, string>
  /** The member, as the audit trail names them (ADR 0061). */
  actor: { kind: 'member'; id: string }
  /** The member the guard returned, with what the subscription grants: a use case reads a limit from it (ADR 0063). */
  member: Member
}

type Declare = <Path extends TenantPath, Schema extends InputSchema = undefined>(
  path: Path,
  spec: TenantRouteSpec<Schema>,
  run: (request: TenantRequest<Path, Schema>) => Promise<unknown>
) => void

type Method = 'GET' | 'POST' | 'PUT' | 'DELETE'

/**
 * What the subscription refuses (ADR 0063), after the permission: a capability the plan lacks, then
 * a write while the organization is read only. A capability comes first, since choosing a plan answers
 * both. `GET` and `DELETE` stay open, so everything stays readable and a record can still be erased.
 */
function checkSubscription(member: Member, method: Method, spec: TenantRouteSpec<InputSchema>): void {
  if (spec.entitlement !== undefined && !entitlement(member, spec.entitlement)) {
    throw new HttpProblem(403, subscriptionProblems.planRequired, {
      detail: "The organization's plan does not include this.",
      entitlement: spec.entitlement
    })
  }
  const writes = method === 'POST' || method === 'PUT'
  if (writes && member.subscription.access === 'read-only' && spec.duringReadOnly !== true) {
    throw new HttpProblem(403, subscriptionProblems.readOnly, {
      detail: 'The organization is read only until its plan is paid for. Nothing was deleted.'
    })
  }
}

function readInput(req: IncomingMessage, method: Method, schema: InputSchema): unknown {
  if (schema === undefined) return undefined
  return method === 'GET' ? readValidQuery(req, schema) : readValidJson(req, schema)
}

function handler<Path extends TenantPath, Schema extends InputSchema>(
  guard: TenantGuard,
  method: Method,
  spec: TenantRouteSpec<Schema>,
  run: (request: TenantRequest<Path, Schema>) => Promise<unknown>
): HttpHandler {
  return async (req, res, { params }) => {
    const organizationId = params.organizationId as string
    const member = await requireMember(guard, req, organizationId, spec.permission)
    checkSubscription(member, method, spec)
    const input = (await readInput(req, method, spec.input)) as TenantRequest<Path, Schema>['input']
    const output = await run({ organizationId, input, params, actor: { kind: 'member', id: member.userId }, member })
    if (output === undefined) res.writeHead(204).end()
    else if (output instanceof FileRedirect) sendRedirect(res, output)
    else sendJson(res, spec.status ?? 200, output)
  }
}

/**
 * How a module declares its tenant routes (ADR 0065): the path, what the route asks of the member and
 * of the input, and the use case. Each request runs the tenant guard (`requireMember`, ADR 0033) with
 * the route's permission, then what the subscription refuses (ADR 0063), then parses its input with
 * the contract schema, then hands the use case the organization's id, the input, the path's
 * parameters, the member as the audit actor (ADR 0061) and the member itself, and answers with what
 * it returns: JSON, nothing (204), or a `FileRedirect` to the store's signed address (ADR 0076). The organization's id comes only out of here, so no tenant route runs without the
 * guard; a use case does its database work in `unitOfWork.run(organizationId, …)` (ADR 0055).
 */
export function tenantRoutes(router: HttpRouter, guard: TenantGuard): Record<Lowercase<Method>, Declare> {
  const on =
    (method: Method): Declare =>
    (path, spec, run) =>
      router.on(method, path, handler(guard, method, spec, run))
  return { get: on('GET'), post: on('POST'), put: on('PUT'), delete: on('DELETE') }
}
