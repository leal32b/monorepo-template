import type { IncomingMessage, ServerResponse } from 'node:http'
import { backOfficeLimits, backOfficeProblems, type OperatorSessionRefusal } from '@repo/contracts'
import type * as z from 'zod/mini'
import { readValidJson } from '#libs/http/body'
import { sendJson } from '#libs/http/json'
import { HttpProblem } from '#libs/http/problem'
import { readValidQuery } from '#libs/http/query'
import { type HttpHandler, HttpRouter } from '#libs/http/router'
import type { Clock } from '#libs/ports/clock.port'
import type { Actor, CurrentSession } from '#modules/identity/index'
import type { OperatorAccount, Operators } from './back-office-unit-of-work.port'

/** What the back office's guard reads: the session, then the operator, by the API's clock (ADR 0077). */
export type OperatorGuard = { session: CurrentSession; operators: Operators; clock: Clock }

type BackOfficePath = `/api/admin/${string}`

type ParamNames<Path extends string> = Path extends `${string}:${infer Name}/${infer Rest}`
  ? Name | ParamNames<Rest>
  : Path extends `${string}:${infer Name}`
    ? Name
    : never

type InputSchema = z.ZodMiniType | undefined

export type BackOfficeRouteSpec<Schema extends InputSchema> = {
  /** The contract schema of a `GET`'s query string or another method's JSON body; nothing is read without it. */
  input?: Schema
  status?: 200 | 201
}

export type BackOfficeRequest<Path extends string, Schema extends InputSchema> = {
  input: Schema extends z.ZodMiniType ? z.output<Schema> : undefined
  params: Record<ParamNames<Path>, string>
  /** The operator, as the session names them. */
  operator: Actor
}

type Declare = <Path extends BackOfficePath, Schema extends InputSchema = undefined>(
  path: Path,
  spec: BackOfficeRouteSpec<Schema>,
  run: (request: BackOfficeRequest<Path, Schema>) => Promise<unknown>
) => void

type Method = 'GET' | 'POST' | 'DELETE'

const hourMs = 60 * 60 * 1000

/** The router's own answer to a path it does not know: nobody but an operator can tell the two apart. */
const notFound = () => new HttpProblem(404, 'not_found')

/** Why the operator's session may not open the back office, or `undefined` when it may (ADR 0077). */
function refusalOf(account: OperatorAccount, actor: Actor, now: Date): OperatorSessionRefusal | undefined {
  if (!account.twoFactorEnabled) return 'two-factor'
  if (account.signsInOtherwise) return 'sign-in-method'
  const signedIn = actor.signedInAt.getTime()
  const fresh = now.getTime() - signedIn <= backOfficeLimits.sessionHours * hourMs
  // A session made after the grant went through the password and a code: the command grants no other account.
  return fresh && signedIn >= account.grantedAt.getTime() ? undefined : 'sign-in-again'
}

async function requireOperator(guard: OperatorGuard, req: IncomingMessage): Promise<Actor> {
  const actor = await guard.session.actorFor(req.headers)
  if (actor === null) throw notFound()
  const account = await guard.operators.find(actor.userId)
  if (account === null) throw notFound()
  const reason = refusalOf(account, actor, guard.clock.now())
  if (reason !== undefined) {
    throw new HttpProblem(403, backOfficeProblems.sessionRefused, {
      detail: 'Sign in again, with two-step verification, to open the back office.',
      reason
    })
  }
  return actor
}

function handler<Path extends BackOfficePath, Schema extends InputSchema>(
  method: Method,
  spec: BackOfficeRouteSpec<Schema>,
  run: (request: BackOfficeRequest<Path, Schema>) => Promise<unknown>
): OperatorHandler {
  return async (req, res, params, operator) => {
    const schema = spec.input
    const input = (
      schema === undefined
        ? undefined
        : method === 'GET'
          ? readValidQuery(req, schema)
          : await readValidJson(req, schema)
    ) as BackOfficeRequest<Path, Schema>['input']
    const output = await run({ input, params: params as BackOfficeRequest<Path, Schema>['params'], operator })
    if (output === undefined) res.writeHead(204).end()
    else sendJson(res, spec.status ?? 200, output)
  }
}

type OperatorHandler = (
  req: IncomingMessage,
  res: ServerResponse,
  params: Record<string, string>,
  operator: Actor
) => Promise<void>

/** Every method a request may carry: each one reaches the guard before anything is said of the path. */
const everyMethod = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS']

/**
 * How the back office declares its routes (ADR 0077), its `tenantRoutes`. Every request under `/api/admin/`,
 * whatever its method and whether its path exists, first reads the session and the operator: no session, or no
 * active operator, is the router's own 404, so the back office cannot be found, not even by a 405. An operator
 * whose session lacks two-step verification, signs in another way, or is older than the grant or than
 * `backOfficeLimits.sessionHours`, gets `403 operator_session_refused` with the reason. Then the route, its
 * input and the use case.
 */
export function backOfficeRoutes(router: HttpRouter, guard: OperatorGuard): Record<Lowercase<Method>, Declare> {
  const routes = new HttpRouter()
  const handlers = new Map<HttpHandler, OperatorHandler>()
  const serve: HttpHandler = async (req, res) => {
    const operator = await requireOperator(guard, req)
    const match = routes.match(req.method as string, (req.url as string).split('?')[0] as string)
    if (match.kind === 'not-found') throw notFound()
    if (match.kind === 'method-not-allowed') {
      throw new HttpProblem(405, 'method_not_allowed', { headers: { Allow: match.allow.join(', ') } })
    }
    await (handlers.get(match.handler) as OperatorHandler)(req, res, match.params, operator)
  }
  for (const method of everyMethod) router.on(method, '/api/admin/*', serve)
  const on =
    (method: Method): Declare =>
    (path, spec, run) => {
      // The inner router only matches: its handler is a key for the operator's handler, which needs the operator.
      const key: HttpHandler = () => undefined
      handlers.set(key, handler(method, spec, run))
      routes.on(method, path, key)
    }
  return { get: on('GET'), post: on('POST'), delete: on('DELETE') }
}
