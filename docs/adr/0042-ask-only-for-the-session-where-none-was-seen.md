# 0042. Ask only for the session where none was seen

- Status: accepted
- Date: 2026-11-07

## Context and problem statement

[ADR 0038](0038-load-screen-data-through-router-queries-and-swap-screens-at-once.md) has the cold load
read the session and the organizations together, so a signed-in user waits one round, not two. A visitor
gets a 401 for the organizations: the browser prints "Failed to load resource" in the console for every
visit to a signed-in address, though the app handles the answer. The session's own read avoids it, since
Better Auth answers a visitor with a 200 and nothing. The cookie that holds the session cannot be read by
the page, so the app cannot tell a visitor from a user before the API answers.

Can the app ask for what needs a session only when there is one, without a slower load for those who
have one?

## Decision drivers

- A visitor's console shows no failed call: the app is meant to be quiet when nothing is wrong.
- A signed-in user's cold load stays one round (ADR 0038).
- No secret kept on the device, and nothing that can let a visitor in: the API still decides.
- The guard keeps asking for everything a screen needs, so a wrong guess only costs a round.

## Considered options

1. A hint on the device that a session was seen: with it, the boot reads go together as before; without
   it, only the session is asked, and the rest waits for its answer.
2. The session first, always, then the rest.
3. Ask for everything at once and accept the console line.
4. A cookie the page can read, set by the API, that says a session exists.

## Decision outcome

Chosen option: "1". `localStorage` holds `session=seen`, only that and never who. The session's query
sets it when it finds a user and clears it on a 401; signing out clears it; any other failure leaves it
as it was, since the session may still be there. A route's `preload` starts its reads only when the hint
is set (`preload` in `routes.tsx`); the session's own read always starts. Without the hint the guard asks
for the organizations once the session answers, as it did before ADR 0038 for any screen it opens. Option 2
adds a round to every signed-in cold load, the common case. Option 3 leaves the noise. Option 4 puts a
second cookie in the API's hands for a convenience.

### Consequences

- Good: a visitor's visit asks for the session and nothing else that needs one.
- Good: a returning user's cold load is as fast as before.
- Bad: the first load after a sign-in on a device, and any load on a new device, is one round slower.
- Bad: a stale hint (a session that ended elsewhere) still prints one refused call, once: the session's
  answer clears it.
- Bad: one more key on the device, to keep in line with the session's life.

## Revisit when

The console line comes back for people who are signed in, the extra round on a first load is noticed, or
the API offers a way to tell a visitor from a user in the same answer as the organizations.
