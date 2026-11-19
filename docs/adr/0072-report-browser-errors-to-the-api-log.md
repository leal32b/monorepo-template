# 0072. Report browser errors to the API log

- Status: accepted
- Date: 2026-11-19

Amends [ADR 0046](0046-observe-through-structured-logs-tagged-with-the-release.md): its last "Bad" (browser errors
outside a call to the API reach no one) is closed without an error tracker.

## Context and problem statement

An API failure leaves a line in the log and shows the user a reference (`code · requestId`) that finds it
([ADR 0046](0046-observe-through-structured-logs-tagged-with-the-release.md)). An exception in the browser, a
component that throws while it draws or a promise nobody caught, leaves nothing: the user sees a blank or broken
screen and support has nothing to search. An error tracker would fix it but is a vendor, an SDK in the first
download and a place where users' data can go; ADR 0046 put it off until the product has paying users. What is the
smallest thing that makes a browser error as findable as an API one, without opening a new way to flood the log or
to leak what a user typed?

## Decision drivers

- A user's reference finds the log line; the line names the commit, as every other line does.
- No new service and no SDK; any host's log viewer is enough.
- The new route is an open door: anyone can post to it, so it must be bounded and must not trust what it is given.
- A report never carries user data, and the browser's budget of JavaScript ([ADR 0045](0045-run-the-end-to-end-suite-on-the-built-app-without-outside-services.md))
  stays within its margin.

## Considered options

1. An error tracker (Sentry or similar) in the browser, keyed by the release.
2. The browser posts a small report to our API, which logs it as one structured line.
3. Log nothing, and ask the user for a screenshot and the time.

## Decision outcome

Chosen option: "2", because it reuses the logger, the release and the rate limiter the API already has, costs a
few hundred bytes, and gives the user the same kind of reference.

- **The route.** `POST /api/client-errors`, answered `204`. It has no session and no tenant, so it is not under
  `/api/public/organizations/…` ([ADR 0059](0059-open-a-public-surface-per-tenant-behind-a-rate-limiter-of-our-own.md)):
  the module `observability` declares it with the same two guards a public route has, the Worker's secret and the
  `Origin` check, and `enforceRateLimit` first, before the body is read. Nothing is written to the database
  beyond the limiter's counter.
- **What a report holds** (`clientErrorReportSchema` in `@repo/contracts`, every field with a length):
  `kind` (`render`, `error` or `unhandledrejection`), `message` (500 characters), `stack` (4000, optional),
  `route` (200), `release` (64) and `reference` (64). Nothing else is accepted, and unknown fields are dropped.
  - `route` is the router's **pattern** (`/:organizationSlug/customers/:customerId`), never the address bar: the
    client reads it from the matched route, and the schema accepts only the characters a pattern has, so a query
    string (`?`, `=`) or a fragment is refused.
  - `release` is the web build's commit (`VITE_RELEASE`, set by the deploy; `dev` when unset). It is the version
    that **threw**, which may differ from the one that answers, so the log keeps it apart: `clientRelease`.
  - `reference` is made in the browser (`client_error` and 12 random hex characters) and is what the screen shows,
    in the same line as an API failure's: "If it keeps happening, tell support: client_error · 3fa9…".
  - Never sent: the URL, the query, a request or response body, a form value, a header, a token, the user or
    organization id. The client also cuts the message and the stack to their limits, removes what looks like an
    email address from them, and drops the query and fragment of any address in them.
- **Rate limits.** On the API, `clientErrorLimit`, `client-errors`: 30 reports per 10 minutes per client address, by
  the ADR 0059 limiter, so it holds across instances and restarts; past it the answer is the usual `429`, and the
  `rate limited` line says which limit. On the page, the client sends at most 5 reports, drops one that repeats an
  earlier report's message and first stack line (the repeat gets the first one's reference), and sends none once it
  has reached the cap, so a loop that throws on every frame costs five requests. Together: a page can send 5, an
  address 30 per window.
- **Delivery.** `navigator.sendBeacon` with a `application/json` blob, which survives the page going away; if the
  browser refuses it, `fetch` with `keepalive: true`. Failures are swallowed: reporting an error must never throw
  another one, and a report that does not arrive is not retried.
- **Where it runs.** An error boundary inside the router's root (so it can read the matched route and keeps the
  theme, language and router), the window's `error` and `unhandledrejection` events, and `ReadFailure` for an error
  that is not an `ApiError` (a failed API call is already in the API log). The boundary's screen is an error alert
  with the reference and a button that reloads the page.
- **How it is logged.** One `warn` line, message `client error`, with the API's own `service`, `release` and the
  request's `reqId`, and the report in fields: `kind`, `clientRelease`, `route`, `reference`, `clientMessage`,
  `clientStack`. `warn`, not `error`: it is not a fault of the API, and a product's alert on `error` should not fire
  on every old tab. [operations.md](../operations.md#browser-errors) says how to find it by reference.
- **Threat model.** Three rows: log flooding (T53), log injection (T54) and personal data in a message (T55).

### Consequences

- Good: a browser error is as findable as an API one, by the same kind of reference and with a commit.
- Good: no vendor, no SDK and no cost; the log drain a product adds later carries these lines too.
- Good: the first download grows by the reporter's few hundred bytes (see the cost below).
- Bad: no grouping, no source-mapped stacks and no alerting: a stack is the minified one, read against the commit's
  build; an error tracker is still the answer at ADR 0046's signal.
- Bad: removing emails and query strings from a message is best effort. A message can still quote a name a screen
  put in it; the limits (500 and 4000 characters) and the log's short retention bound the damage, and a message
  written by our own code never includes user data.
- Bad: a route that is open to anyone is a place to write into our log. The limits bound the volume; a line is
  `warn` and says `client error`, so it is never taken for the API's own.

### Results

The first download grows by the reporter and the boundary: see the measure in
[testing.md](../testing.md#javascript-budgets) and the budgets in `bundle-budget.spec.ts`.

## Revisit when

The product has paying users (add an error tracker, as ADR 0046 says, and keep this route for what it cannot see), or
a line from this route is mostly noise in the log (lower the limit or the page cap).
