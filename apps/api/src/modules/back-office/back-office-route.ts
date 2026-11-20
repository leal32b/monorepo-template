import type { IncomingMessage } from 'node:http'
import { backOfficeLimits, backOfficeProblems, type OperatorSessionRefusal } from '@repo/contracts'
import type * as z from 'zod/mini'
import { readValidJson } from '#libs/http/body'
import { sendJson } from '#libs/http/json'
import { HttpProblem } from '#libs/http/problem'
import { readValidQuery } from '#libs/http/query'
import type { HttpHandler, HttpRouter } from '#libs/http/router'
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
  guard: OperatorGuard,
  method: Method,
  spec: BackOfficeRouteSpec<Schema>,
  run: (request: BackOfficeRequest<Path, Schema>) => Promise<unknown>
): HttpHandler {
  return async (req, res, { params }) => {
    const operator = await requireOperator(guard, req)
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

/**
 * How the back office declares its routes (ADR 0077), its `tenantRoutes`. Each request reads the session and
 * the operator: no session, or no active operator, is the router's own 404, so the back office cannot be found;
 * an operator whose session lacks two-step verification, signs in another way, or is older than the grant or
 * than `backOfficeLimits.sessionHours`, gets `403 operator_session_refused` with the reason. Then the input,
 * then the use case.
 */
export function backOfficeRoutes(router: HttpRouter, guard: OperatorGuard): Record<Lowercase<Method>, Declare> {
  const on =
    (method: Method): Declare =>
    (path, spec, run) =>
      router.on(method, path, handler(guard, method, spec, run))
  return { get: on('GET'), post: on('POST'), delete: on('DELETE') }
}
