import type { IncomingMessage, ServerResponse } from 'node:http'
import { organizationSlugSchema } from '@repo/contracts'
import type { Logger } from 'pino'
import { HttpProblem } from '#libs/http/problem'
import { enforceRateLimit } from '#libs/http/rate-limit'
import type { HttpHandler, RouteContext } from '#libs/http/router'
import type { RateLimit, RateLimiter } from '#libs/ports/rate-limiter.port'
import type { PublicOrganization, PublicOrganizations } from './public-organizations.port'

/**
 * How much one client address may ask of the public surface (ADR 0059): a product changes them here,
 * or passes a limit of its own to one route. A fixed window lets up to twice the number through
 * across its edge.
 */
export const publicLimits = {
  /** Reads, hits and misses alike: it is also how fast slugs can be probed. */
  read: { name: 'public-read', max: 60, windowSeconds: 60 },
  /** Writes: what a person sends in a sitting, with room for a few people behind one address. */
  write: { name: 'public-write', max: 10, windowSeconds: 600 }
} as const satisfies Record<string, RateLimit>

/** What every public route is built from. */
export type PublicSurface = {
  limiter: RateLimiter
  organizations: PublicOrganizations
  logger: Logger
}

/** A public route's handler: there is no actor, only the organization its path named. */
export type PublicHandler = (
  req: IncomingMessage,
  res: ServerResponse,
  ctx: RouteContext & { organization: PublicOrganization }
) => void | Promise<void>

/**
 * The guard for routes without a session (ADR 0059), under `/api/public/organizations/:organizationSlug`:
 * the counterpart of `requireMember`. It counts the request against `limit` for the client address
 * first (429 past it), then resolves the slug (404 when no organization has it, the same on every
 * public route), then calls `handler` with the organization. The organization's id comes only out of
 * here, so no public route runs without its limit; a use case runs its database work in
 * `unitOfWork.run(organization.id, …)`, confined to that organization like a member's (ADR 0055).
 */
export function publicRoute(surface: PublicSurface, limit: RateLimit, handler: PublicHandler): HttpHandler {
  return async (req, res, ctx) => {
    await enforceRateLimit(surface, req, limit, ctx.requestId)
    const slug = organizationSlugSchema.safeParse(ctx.params.organizationSlug)
    // A slug that cannot be one is nobody's: no query.
    const organization = slug.success ? await surface.organizations.bySlug(slug.data) : null
    if (organization === null) {
      throw new HttpProblem(404, 'organization_not_found', { detail: 'No organization has this address.' })
    }
    await handler(req, res, { ...ctx, organization })
  }
}
