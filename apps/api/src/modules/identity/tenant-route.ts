import type { IncomingMessage } from 'node:http'
import type { Permissions } from '@repo/contracts'
import type * as z from 'zod/mini'
import { readValidJson } from '#libs/http/body'
import { sendJson } from '#libs/http/json'
import { readValidQuery } from '#libs/http/query'
import type { HttpHandler, HttpRouter } from '#libs/http/router'
import type { CurrentSession } from './current-session.port'
import type { Membership } from './membership.port'
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
}

/** What the use case is handed: the organization the guard confirmed, the valid input, the path and who acts. */
export type TenantRequest<Path extends string, Schema extends InputSchema> = {
  organizationId: string
  input: Schema extends z.ZodMiniType ? z.output<Schema> : undefined
  params: Record<ParamNames<Path>, string>
  /** The member, as the audit trail names them (ADR 0061). */
  actor: { kind: 'member'; id: string }
}

type Declare = <Path extends TenantPath, Schema extends InputSchema = undefined>(
  path: Path,
  spec: TenantRouteSpec<Schema>,
  run: (request: TenantRequest<Path, Schema>) => Promise<unknown>
) => void

type Method = 'GET' | 'POST' | 'PUT' | 'DELETE'

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
    const input = (await readInput(req, method, spec.input)) as TenantRequest<Path, Schema>['input']
    const output = await run({ organizationId, input, params, actor: { kind: 'member', id: member.userId } })
    if (output === undefined) res.writeHead(204).end()
    else sendJson(res, spec.status ?? 200, output)
  }
}

/**
 * How a module declares its tenant routes (ADR 0065): the path, what the route asks of the member and
 * of the input, and the use case. Each request runs the tenant guard (`requireMember`, ADR 0033) with
 * the route's permission, then parses its input with the contract schema, then hands the use case
 * the organization's id, the input, the path's parameters and the member as the audit actor
 * (ADR 0061), and answers with what it returns. The organization's id comes only out of here, so no
 * tenant route runs without the guard; a use case does its database work in
 * `unitOfWork.run(organizationId, …)` (ADR 0055).
 */
export function tenantRoutes(router: HttpRouter, guard: TenantGuard): Record<Lowercase<Method>, Declare> {
  const on =
    (method: Method): Declare =>
    (path, spec, run) =>
      router.on(method, path, handler(guard, method, spec, run))
  return { get: on('GET'), post: on('POST'), put: on('PUT'), delete: on('DELETE') }
}
