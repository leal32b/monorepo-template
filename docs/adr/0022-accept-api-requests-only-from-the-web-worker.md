# 0022. Accept API requests only from the web Worker

- Status: accepted
- Date: 2026-10-28

## Context and problem statement

[ADR 0019](0019-reach-the-api-through-the-web-worker.md) has the web Worker proxy `/api/*`, but
the API stays public at `*.onrender.com`. That ADR trusted `X-Forwarded-For` only as a hint for
that reason.

Phase 6 makes the client IP matter: Better Auth's rate limits count per IP
([ADR 0020](0020-authenticate-with-better-auth.md)). Two problems follow:

- A caller that talks to the API directly can send any IP header and dodge every limit.
- A proxy in front of the API may append its own hop to `X-Forwarded-For`. Better Auth trusts
  only a single-value header (`getIPFromHeader` in `@better-auth/core`), and with a chain it
  falls back to one shared bucket per path.

How does the API know a request came through the Worker, and which IP sent it?

## Decision drivers

- Rate limits and IP-based checks rest on an address no client can forge.
- It works on the free tiers, with the default hostnames.
- Render's health check and the deploy smoke test keep working.
- Development, without a Worker, keeps working with no extra setup.

## Considered options

1. A shared secret: the Worker adds `X-Proxy-Secret`, and the API refuses requests without it.
2. Allow only Cloudflare's IP ranges. Every Cloudflare customer's Worker comes from them, so
   they prove nothing.
3. Private networking between the Worker and the API. Render's private network is not reachable
   from Cloudflare.
4. mTLS from the Worker, through Authenticated Origin Pulls or an mTLS certificate binding.
   Render ends TLS at its own edge, so the API never sees the client certificate.
5. Keep the API open and limit per path only. Then one attacker can lock everyone out.

## Decision outcome

Chosen option 1.

**The Worker:**
- sets `X-Proxy-Secret` from a Worker secret;
- overwrites `X-Client-IP` with the inbound `CF-Connecting-IP`;
- forwards the rest unchanged.

A value a client sends in either header is replaced.

**The API:**
- compares `X-Proxy-Secret` with `PROXY_SECRET` in constant time, before routing;
- answers a 403 problem when the header is missing or wrong;
- exempts only the read-only health routes (`/api/health`, `/api/health/live`), for Render and
  the deploy smoke test.

Better Auth reads the client IP from `X-Client-IP` alone (`advanced.ipAddress.ipAddressHeaders`).

**The secret.**
- 32 random bytes.
- A GitHub `production` secret, pushed by the deploy to the Worker (`wrangler secret`) and to
  Render.
- To rotate it, change the GitHub secret and redeploy. Requests during the switch may fail
  once.

**Development.** With `PROXY_SECRET` unset, the check is off and the IP falls back to localhost,
as Better Auth does in development. Env validation requires the secret when the web origin is
`https`.

This replaces the `X-Forwarded-For` line of ADR 0019. The step that builds the Worker checks on
the deployed pair which forwarding headers reach the API.

### Consequences

- Good: the auth and data routes answer only through the Worker, so its headers can be trusted.
- Good: the client IP is a single value no client can set, which the rate limiter needs.
- Bad: one more secret to keep and rotate. If it leaks, direct access is back until rotation.
- Bad: the health routes stay public; they reveal only up or down.
- Bad: on a host other than Render the same check applies, but its health check path may need
  the same exemption.

## Revisit when

- The API moves to a host that checks client certificates, or one with private networking the
  Worker can reach; either can replace the secret.
