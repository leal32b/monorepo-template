# 0046. Observe through structured logs tagged with the release

- Status: accepted
- Date: 2026-11-07

## Context and problem statement

The template already writes a lot about itself: the API logs one JSON line per request with pino
(request id, route, status, duration), never headers or bodies; every problem response carries the
`requestId`, and the web shows it beside an unexpected failure, so a user can quote it to support;
`/api/health/live` and `/api/health` tell a platform and a person whether the API and its database
answer ([ADR 0014](0014-hosting-and-deploy-from-github-actions.md)).

Three gaps remain before a product can run on it:

- No line says which version wrote it. After a deploy, an error cannot be tied to the commit that
  caused it, and nothing proves the new image is the one answering.
- The web Worker keeps no record: when the API is out of reach, the Worker's exception is lost.
- Nothing says what to watch, where the logs are, or when a product outgrows them.

What is the smallest observability a SaaS built from the template needs on day one, on any host?

## Decision drivers

- Works on any host that collects stdout; no agent, no account, no extra cost on free tiers.
- A user's report (the request id) leads to the exact log lines, and those lines to a commit.
- A deploy proves that the new version answers.
- Leaves room for error tracking, metrics and tracing without rewriting the code.

## Considered options

1. Structured logs on stdout tagged with the release, the host's log viewer, and an external uptime
   check on `/api/health`.
2. OpenTelemetry from the start (traces, metrics, logs) exported to a collector or a vendor.
3. An error tracker (Sentry or similar) in the API and the browser from the start.

## Decision outcome

Chosen option: 1, because it closes the three gaps with a few lines and no new service, and the
`requestId` already joins a user's report to the log.

- **Release:** the image build sets `RELEASE` to the commit (`--build-arg`, `apps/api/Dockerfile`);
  unset, it is `dev`. `createLogger` (`#libs/logging/create-logger`) adds `service` and `release` to
  every line of the API and of the migration; `GET /api/health` answers `release`, and the deploy's
  smoke test fails when it is not the commit just deployed.
- **Worker:** Cloudflare Workers Logs is on (`observability` in `wrangler.jsonc`): each request, its
  status and any exception, read in Cloudflare's dashboard. A host without such logs would log from
  the Worker itself.
- **Watching:** the host's log viewer for the API's stdout (Render's, in the template), and an
  external uptime check on `GET /api/health` every few minutes, which wakes the database only as
  often as it runs. What to look for is in [docs/operations.md](../operations.md).

### Consequences

- Good: every log line and every health answer names its commit; a deploy that did not take fails CI.
- Good: no vendor, no SDK and no cost; any log drain can ship the JSON lines elsewhere unchanged.
- Bad: no aggregation, alerting or retention beyond what the host gives (Render's free plan keeps
  logs for a short time); the uptime check is set up by hand, outside the repository.
- Bad: browser errors outside a call to the API (a bug in a component) reach no one.

## Revisit when

The product has paying users (add an error tracker for the API and the browser, keyed by the same
`release`), a request spans more than one service (add OpenTelemetry traces with the `requestId`),
or the host's log retention is shorter than the time it takes to hear about a problem.
