# 0015. Serve the web origin with a CORS allowlist, `OPTIONS` and `HEAD`

- Status: accepted
- Date: 2026-10-24

## Context and problem statement

In production the web app and the API live on different origins
([ADR 0014](0014-hosting-and-deploy-from-github-actions.md)), so the browser only lets the web
read API responses that carry CORS headers, and it sends a preflight `OPTIONS` before
non-simple requests. [ADR 0007](0007-http-pipeline-on-node-http.md) listed `HEAD` and
`OPTIONS`/CORS as not yet built; this record adds them to the pipeline.

## Decision drivers

- Only the origins we deploy can read API responses; the list is configuration, not code.
- Every behaviour is explicit and has an integration test, like the rest of the pipeline.
- Errors (404, 405, 500 problems) stay readable by the allowed web origin.
- No decision about credentials before authentication exists (Phase 6).

## Considered options

1. CORS in the pipeline with an exact-origin allowlist from the environment.
2. Same origin through a Cloudflare Worker that proxies `/api` to the API.
3. `Access-Control-Allow-Origin: *`.

## Decision outcome

Chosen option 1. In `libs/http`, after the request id and before routing:

- **Allowlist.** `CORS_ORIGINS` is a comma-separated list of exact origins
  (`https://app.example.com`), validated with Zod at boot; `*` is rejected. Every response
  carries `Vary: Origin`.
- **Allowed origin.** Responses get `Access-Control-Allow-Origin: <that origin>` and
  `Access-Control-Expose-Headers: X-Request-Id`. A preflight (`OPTIONS` with
  `Access-Control-Request-Method`) on a known path answers 204 with `Access-Control-Allow-Methods`
  (the path's methods), `Access-Control-Allow-Headers` (an explicit list) and
  `Access-Control-Max-Age`.
- **Other origins** get no CORS headers and the browser blocks the read. CORS is not access
  control: the request is still served as for any other client.
- **`OPTIONS`** without a preflight on a known path answers 204 with `Allow`.
- **`HEAD`** is answered by the matching `GET` route, without a body. `Allow` (on 405 and
  `OPTIONS`) lists `HEAD` and `OPTIONS` next to the registered methods.
- **No credentials** (`Access-Control-Allow-Credentials` is never sent) until Phase 6 decides.

Option 2 removes CORS and makes cookies first-party, at the cost of a proxy hop and Worker code
to deploy and test; it stays the candidate for Phase 6. Option 3 lets any site read the API and
can never be combined with credentials.

### Consequences

- Good: a new web origin is a variable change, not a code change.
- Good: problem responses stay readable by the web, so the UI shows the real error.
- Bad: the default domains (`*.workers.dev`, `*.onrender.com`) are different sites; cookie
  sessions in Phase 6 need a shared custom domain or the proxy of option 2.
- Bad: one more environment variable to keep in sync with the deployed web origin.

## Revisit when

Authentication needs credentials across origins, a custom domain is set up, or a public API
must be callable from any origin.
