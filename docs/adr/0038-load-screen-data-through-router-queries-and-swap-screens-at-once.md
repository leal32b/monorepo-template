# 0038. Load screen data through the router's queries, and swap screens at once

- Status: accepted
- Date: 2026-11-05

## Context and problem statement

A review of the web app on 2026-11-05 measured, on the production build with each API call 200 ms away,
how screens load and wait (findings W01 to W13). Each page read its data when it rendered
(`createResource` in 11 places), and a child read only after its parent's data, so a cold load of an
organization's members waited on six API rounds in series: content at 1.4 s, 5.5 s at 900 ms per call.
Every revisit read the same data again and waited again. Screens of one kind waited in two ways:
`latest` suspends until its first value, so the previous screen was held; `state === 'ready'` does not,
so the next screen opened empty. The progress bar of [ADR 0035](0035-show-the-server-working-with-one-progress-bar.md)
went blind inside the router's transitions. And holding the screen until the next was ready
([ADR 0036](0036-keep-the-screen-until-the-next-one-is-ready.md)) meant a click showed nothing for as long
as the slowest read took: 0.5 s at 200 ms per call, 1.9 s at 900 ms.

How does every screen, the ones not written yet included, load only what it needs, in as few round trips
as possible, and wait in one way?

## Decision drivers

- A request starts as soon as what it needs is known, and never waits on one it does not need.
- One read per piece of data: screens share it, and a screen read before draws at once.
- One way to wait, decided by what is on screen, with nothing to remember per screen.
- A click shows at once that it landed.
- No new dependency, and the shape closest to Solid 2's async model, so its migration shrinks.
- Every wait is visible, and nothing shifts ([design-system](../../.claude/skills/design-system/SKILL.md)).

## Considered options

Where the data lives:

1. The router's own `query`, `preload` and `createAsync`.
2. `@tanstack/solid-query` behind the same entity functions.
3. `createResource` in the pages, with a cache added to each.

The cold start:

1. In the web only: the session and the organizations read together, the sign-in options off the
   signed-in path.
2. A bootstrap endpoint as well, `GET /api/me`: the user, the organizations and the permissions in each.

How a navigation waits:

1. Hold the current screen until the next is ready (ADR 0036).
2. Swap to the next screen at once, and show its skeleton until its data is in.

## Decision outcome

Chosen, by the owner on 2026-11-05: the router's queries, the cold start in the web only, and the swap at
once. It is done on Solid 1, now.

The loading contract, for every screen:

1. **Reads live in the route, not the component.** Each server read is a `query()` in its entity's
   `api` segment, keyed by its arguments. The route that needs it calls it in `preload`; the screen reads
   it with `createAsync`. The router then starts the code and the data of every matched route at once,
   and again when a link to them is hovered, focused or touched.
2. **Nothing waits on what it does not need.** The session and the organizations start together at boot.
   A tenant route starts the caller's membership and its page's reads together, once the slug is known.
   The sign-in options are read by the entry screens only, the service status once per app session.
3. **One read per piece of data.** Screens share queries by key, so Members and Roles read the lists
   once. A screen read before draws its last value at once and reads again behind it. After a change, the
   action updates or revalidates the query by its key, never a page's own copy. Signing out clears them.
4. **The bar sees every wait.** It follows the router's pending navigation (`useIsRouting`) and the
   requests out, which are counted outside Solid's reactivity: Solid 1 keeps a signal written inside a
   transition aside until the transition commits, so a count kept in one went wrong (W01).
5. **A navigation never waits on data.** The next screen is drawn at once, its title and its family's
   skeleton, which shows after `motion.waitDelay` until the data is in, in the frame that stays
   ([ADR 0037](0037-keep-one-app-frame-across-screens.md)). Only a screen's code not loaded yet holds the
   current screen a moment; the chosen menu item is marked at once, and the bar shows after the same
   delay.
6. **No hand-made loading per page.** No `createResource` in a page, no `state === 'ready'` gate, no
   fallback that cannot be reached. A page draws its data; waiting is the route's and the frame's; a read
   that failed shows the one shared alert with its retry.

One way to wait, decided by what is on screen:

| Situation | What the user sees |
| --- | --- |
| Nothing drawn yet (a cold load) | The frame as soon as the session and the organizations are in; the page area shows its family's skeleton, timed once from boot |
| Moving to another screen | The chosen menu item marked at once; the next screen at once, its title and its skeleton until its data is in |
| A screen read before | Drawn at once from its last value, read again behind it; the bar only if slow |
| An action | Its button's pending; then its query updated or read again, with no remount |
| Data on screen read again | The bar only |

What it rests on, checked in the installed versions (Solid 1.9, the router 1.0): a signal written during a
transition is held until the transition commits; `resource.latest` suspends until its first value, which
ADR 0036 had wrong; the router starts every matched route's lazy code and `preload` at once; `query`
reuses an entry for 5 s, while a screen reads it, or for a move back or forward, and drops an entry nobody
read for 3 minutes, so drawing a revisit at once seeds `createAsync` with the key's last value and reads
`latest`.

How it was built, noted on 2026-11-06 before the branch was merged; the decision is unchanged. The small
helper is `createRead` (`#shared/api`): the router's `createAsync` seeded with the key's last answer, so a
revisit draws at once, with `updateRead`, which puts an action's change into a key on every screen that
reads it with no request, and `readAgain`, which asks again for a key. `createQuery` is the router's
`query` with a failed read left out of the cache, so a retry asks again. A read that fails is said by
`ReadFailure` (`#shared/ui`), which sends a read that found the session ended to sign in and back. A
route's `preload` reads its `params` at once, since the router changes them only when its transition
commits.

`@tanstack/solid-query` was set aside: a new dependency (about 12 KB gzip) and a second concept, its
Solid 2 support unknown, for what a small helper over the router's cache does. Pages with a cache of their
own were rejected: they keep the reads in the components, so the waterfalls stay. `GET /api/me` was left
for later: one round fewer, but it changes the contracts, the API and the guard of
[ADR 0033](0033-organizations-with-roles-in-the-database-behind-a-path-guard.md). Holding the screen was
dropped: measured, a click looked lost for as long as the slowest read.

### Consequences

- Good: a cold load waits on two API rounds instead of six, and a revisit draws at once.
- Good: one way to wait on every screen, the next ones included, and a bar that covers every wait.
- Good: `query` with `createAsync` is the Solid 1 shape closest to Solid 2's model.
- Bad: a visitor without a session who opens an app address gets a 401 for the organizations in the
  console, since they are read beside the session.
- Bad: a short wait shows the next screen's title over an empty body, until the skeleton's delay;
  with preload on intent and revisits from the cache, most screens never wait.
- Bad: the router's cache is one map for the whole app, keyed by strings: an entry outlives a sign-out
  unless it is cleared, and a key spelled two ways reads twice.
- Bad: it replaces ADR 0036, the part of ADR 0035 that said what drives the bar, and the part of
  ADR 0037 where the guard's placeholder stood the frame aside.

## Revisit when

Solid 2 ships its async primitives (move to them), a screen needs data the router cannot key (a stream, a
subscription), two rounds at boot are too slow in production (add `GET /api/me`), or the helper that draws
a revisit at once turns awkward (try `@tanstack/solid-query`).
