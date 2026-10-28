# 0019. Reach the API through the web Worker, on the web origin

- Status: accepted
- Date: 2026-10-28

## Context and problem statement

Phase 6 adds sessions. In production the web is served from `*.leal32b.workers.dev` and the API
from `*.onrender.com` ([ADR 0014](0014-hosting-and-deploy-from-github-actions.md)). Both
`workers.dev` and `onrender.com` are on the [Public Suffix List](https://publicsuffix.org/list/public_suffix_list.dat),
so the two hosts are different sites. A session cookie set by the API would be a third-party
cookie for the web, and several browsers block or partition those by default.
[ADR 0014](0014-hosting-and-deploy-from-github-actions.md) and
[ADR 0015](0015-cross-origin-access-with-a-cors-allowlist.md) left this open for Phase 6.

How does the browser reach the authenticated API with a first-party session, on the free tiers
and without a custom domain?

## Decision drivers

- The session cookie is first-party and `HttpOnly`: no script can read it.
- It works on the free tiers with the default hostnames, so a product needs no domain to start.
- Development and production take the same path; the Vite dev server already proxies `/api` on
  the web origin.
- Few new moving parts; the API stays a plain container.

## Considered options

1. The web Worker proxies `/api/*` to the API. With `assets.run_worker_first: ["/api/*"]`, a
   small Worker script handles those paths, and every other path is a static asset as today
   ([Cloudflare: routing](https://developers.cloudflare.com/workers/static-assets/routing/single-page-application/)).
2. A custom domain shared by both: `app.<domain>` and `api.<domain>` are the same site, so a
   `SameSite=Lax` cookie works, and CORS with credentials stays.
3. A bearer token in the `Authorization` header, kept by the web app, with no cookie.
4. The API container also serves the built web, on one origin.

## Decision outcome

Chosen option 1, built at the start of Phase 6.

- **Path.** The browser calls `/api/...` on the web origin. The Worker forwards method, path,
  query, headers and body to the API origin and returns the response unchanged. It sets
  `X-Forwarded-For` from the inbound `CF-Connecting-IP`, because Cloudflare does not do it for
  Worker subrequests to another site
  ([Cloudflare: HTTP headers](https://developers.cloudflare.com/fundamentals/reference/http-headers/)).
- **Client.** `VITE_API_BASE_URL` stays empty in production, so the web client calls its own
  origin, as in development.
- **Session cookie (Phase 6).** The API sets it with the `__Host-` prefix, `Secure`, `HttpOnly`,
  `SameSite=Lax` and `Path=/`; only the web origin ever sees it.
- **CORS.** The allowlist of ADR 0015 stays in the pipeline, but production leaves
  `CORS_ORIGINS` empty: the same origin needs no CORS. State-changing requests check `Origin`
  against the web origin against CSRF; the threat model of Phase 6 designs it.
- **Configuration.** The API origin is a Worker variable in `wrangler.jsonc`, set by the deploy
  workflow from the GitHub environment.

Option 2 makes every product buy and wire a domain before its first login. It also keeps CORS
with credentials, and preview hostnames stay cross-site. Option 3 puts the session where any XSS
can read it and leaves refresh and revocation to us. Option 4 puts the web behind Render's sleep,
about a minute after 15 idle minutes ([Render](https://render.com/docs/free)), and drops the CDN.

Errata in ADR 0014, which stays as written: CI builds the API image without pushing it, and the
deploy workflow builds it again from the same commit with the same layer cache. "Production runs
the image CI built" holds for the commit and the Dockerfile, not for the artifact.

### Consequences

- Good: the session cookie is first-party on the default hostnames; no domain is needed.
- Good: the production path has no CORS and no preflight, and the browser sends the same
  requests in development and production.
- Bad: every API call takes one more hop (browser, Worker, Render), to be measured when it lands.
- Bad: the Worker becomes code with tests and a deploy. `_headers` does not apply to its
  responses, so the API sets its own security headers.
- Bad: on the free plan, `/api/*` requests count against 100,000 Worker requests a day and get a
  429 past that; static assets stay free and unlimited
  ([Cloudflare: billing](https://developers.cloudflare.com/workers/static-assets/billing-and-limitations/)).
- Bad: the API stays reachable directly at `*.onrender.com`, so it trusts `X-Forwarded-For` only
  as a hint until requests are restricted to the Worker.

## Revisit when

Traffic nears 100,000 API requests a day, a custom domain is bought (option 2 becomes cheap), or
the extra hop shows in response times.
