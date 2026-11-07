# 0043. Remove the service status from the web

- Status: accepted
- Date: 2026-11-07

## Context and problem statement

The web asked `GET /api/health` once per session ([ADR 0037](0037-keep-one-app-frame-across-screens.md))
and showed the answer three ways: an icon with a popover in the side menu, a line above the account when
something was wrong ([ADR 0039](0039-draw-every-signed-in-screen-in-the-one-frame.md)), and a notice on
the entry screens, so a failed sign-in was not taken for a wrong password.

What it gave the user was small. A page already says what failed where it failed, with its retry and the
reference to quote to support (ADR 0038); a slow or sleeping server is said by the wait itself
([ADR 0041](0041-say-why-a-cold-start-takes-long-and-end-the-wait.md)); and a probe cannot warn of a
server that does not answer, since it waits like every other call. It cost one request per load, and
`/api/health` reads the database, so a visitor on the sign-in screen could wake it
([ADR 0014](0014-hosting-and-deploy-from-github-actions.md) wants health checks not to spend the free
budget). It also carried an entity, a provider, three components, the `Popover` of the design system
(used by nothing else) and a test fixture in about twenty files.

Should the web keep showing the state of the service?

## Decision drivers

- Fewer requests on a load, and none that wakes the database for a visitor.
- Less code in the web and the design system, with nothing left that only this served.
- The failure a user meets is still said, where it happens, with a way to try again.
- The API's health routes stay for the platform and the deploy.

## Considered options

1. Remove it from the web: the entity, the provider, the icon, the line and the notice, with the
   `Popover` and the icon only they used; keep the API's routes.
2. Keep only the notice on the entry screens.
3. Keep it and ask `/api/health/live`, which does no I/O.

## Decision outcome

Chosen option: "1". Option 2 keeps the request, the provider and the texts for one message. Option 3
keeps all the code and says only whether the process is up, which the wait already shows. The API's
`/api/health` and `/api/health/live` stay: Render's check and the deploy's smoke test use them
([ADR 0022](0022-accept-api-requests-only-from-the-web-worker.md)).

### Consequences

- Good: one request fewer on every load, and none that touches the database for a visitor.
- Good: `entities/health`, `ServiceStatusProvider`, `ServiceStatusButton`, `ServiceProblem`,
  `ServiceNotice`, `Popover`, the `activity` icon and their texts and tests are gone.
- Bad: a known outage is no longer said before the user tries; they learn it from the failure.
- Bad: the user no longer has a button to "check again"; the retry of the failing screen does it.

## Revisit when

An outage the user cannot tell from their own connection costs real support contacts, or the product
gets a status page of its own that the web should link to.
