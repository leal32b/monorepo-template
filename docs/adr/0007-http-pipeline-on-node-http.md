# 0007. HTTP pipeline on plain `node:http`

- Status: accepted
- Date: 2026-10-17

## Context and problem statement

The API needs routing, JSON responses, one error format and a request log. Either a framework
provides them, or the repository owns a small, tested pipeline.

## Decision drivers

- Every behaviour at the HTTP boundary must be explicit, reviewable and tested.
- The surface starts tiny; dependencies are justified one by one.
- Moving to a framework later must not rewrite use cases.

## Considered options

1. Plain `node:http` with a small pipeline in `apps/api/src/libs/http`.
2. Fastify (schemas, hooks, built-in pino).
3. Express 5 plus middleware.
4. Hono on the Node adapter.

## Decision outcome

Chosen option 1. For every request, in order (`libs/http/server.ts`):

1. **Request id**: a well-formed `X-Request-Id` (`[\w.-]{1,128}`) is kept, otherwise a UUID;
   echoed in the response header, in every problem body and in the log.
2. **Routing**: 404 for unknown paths; 405 with `Allow` for known paths with another method;
   parameters are percent-decoded and a malformed encoding is a 400. The first registered route
   that matches wins, so register literal paths before `:param` paths.
3. **Handler**.
4. **Error boundary**: an `HttpProblem` becomes its response, an `ExceptionBase` is mapped by
   family, anything else is logged with its stack and answered as an opaque 500. Responses use
   `application/problem+json` (RFC 9457) validated by `apiProblemSchema`
   ([ADR 0005](0005-contracts-as-zod-schemas.md)). If the response has already started, the
   connection is cut.
5. **Access log**: one structured pino line per request (id, method, route pattern, path,
   status, duration); headers and bodies are never logged. 5xx is `error`, 4xx `warn`.

Around it: the environment is validated with Zod at boot (variables named, values never
printed) and `SIGTERM`/`SIGINT` trigger a graceful shutdown (stop accepting, drain in-flight
requests, drop idle connections, cut what remains after a timeout).

**Not yet built** (each arrives with a test when a feature needs it): `HEAD` and `OPTIONS`/CORS
(deploy phase, web and API on different origins), JSON body reading with a size limit, content
type check and schema validation (before the first write route, auth phase).

### Consequences

- Good: the whole boundary is small and has an integration test per behaviour.
- Good: framework-agnostic; a later move keeps the problem format, schemas and use cases.
- Bad: features a framework gives for free (compression, content negotiation, streaming,
  OpenAPI) must be written when needed; route matching is linear.

## Revisit when

The API needs streaming responses, more than ~50 routes, or OpenAPI generation. Fastify is then
the natural step.
