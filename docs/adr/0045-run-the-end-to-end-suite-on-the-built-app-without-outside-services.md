# 0045. Run the end-to-end suite on the built app, without outside services

- Status: accepted
- Date: 2026-11-07

## Context and problem statement

Phase 8 adds a browser suite (Playwright). Four things in the repo shape how it can run:

- Sign-up needs a confirmed email, and without Resend the link only reaches the API log (ADR 0021).
- Sign-up and password changes call Have I Been Pwned, and fail closed when it cannot be reached.
- Better Auth limits sign-ins and sign-ups to 3 per 10 s per client address, and the dev proxy sent one
  fixed address for everybody.
- In production the browser reaches the API through the web Worker (ADR 0019, ADR 0022); dev and
  `vite preview` skip it.

The question: which app does the suite drive, and how does it read emails and stay off the internet,
while the repository stays small and production code gains no switch for tests?

## Decision drivers

- A gate must be deterministic: no outside service, no retry.
- No flag in production code that only tests use; the production entry stays as it is.
- Test what users get: the production build and its Content Security Policy.
- Each layer tests what only it can show; the suite does not repeat rule tests the API already has.

## Considered options

1. `wrangler dev` with the real Worker in front of the API.
2. `vite preview` of the production build, with the CSP of `public/_headers`, in front of the API.
3. An `EMAIL_OUTBOX` setting in the production configuration, and Have I Been Pwned live.
4. A second entry, `main.e2e.ts`, with the production wiring, a file email sender and an offline breach
   check.

## Decision outcome

Chosen: options 2 and 4.

- **The app:** `vite preview` serves `dist` with the headers `public/_headers` gives every path, read by
  `vite.config.ts`, so a CSP break fails the suite. The Worker's own logic (proxy, secret, asset 404) stays
  covered by `worker.test.ts` and by the deploy smoke test.
- **The API:** `apps/api/src/main.e2e.ts` builds the app with `createApp` as `main.ts` does, but emails go
  to `FileEmailSender` (one JSON line per message in `E2E_OUTBOX`), and requests to the breached-password
  range API get an empty answer. It is excluded from coverage like `main.ts`, never bundled and never
  deployed; `pnpm --filter @repo/api e2e` migrates and starts it.
- **The database:** a PGlite server with an in-memory database, fresh for each run.
- **Rate limiting** stays on. The dev and preview proxy keeps a client's own `X-Client-IP` and sets
  `127.0.0.1` only when none comes; each test sends its own, as separate users have separate addresses.
  In production the Worker always replaces the header (ADR 0022).
- **Scope:** a few journeys that cross every layer. Rules and edge cases (the 429, a breached password,
  the last owner, an email taken) stay in the API and component tests that already prove them.

### Consequences

- Good: the suite runs offline, on one machine, with nothing to install but Chromium.
- Good: production code gains one small adapter and no setting.
- Bad: `main.e2e.ts` repeats the arguments of `createApp`; a new required dependency fails its
  typecheck, but a new optional one could be missed there.
- Bad: the suite does not exercise the Worker in the browser.

## Revisit when

The Worker gains logic beyond proxying and headers, or the production entry gains wiring that
`createApp` does not hold.
