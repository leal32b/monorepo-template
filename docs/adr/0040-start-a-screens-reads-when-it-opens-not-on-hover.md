# 0040. Start a screen's reads when it opens, not when its link is hovered

- Status: accepted
- Date: 2026-11-06

## Context and problem statement

[ADR 0038](0038-load-screen-data-through-router-queries-and-swap-screens-at-once.md) has the router start
a screen's code and data when the screen opens, and again when a link to it is hovered for 20 ms, focused
or touched. Running the app locally, the owner saw the API asked as the pointer passed over the side menu:
three reads for Members and for Roles, two for Security, one for onboarding and for an invitation, for
screens the user may never open. The phase's measurements were all taken with clicks and no hover, so its
targets hold without it.

Should a link that is only hovered, focused or touched start its screen's reads?

## Decision drivers

- The API is asked only for the screens the user opens: load only what is needed.
- The network panel and the API's logs show real visits, not the pointer's path.
- A first visit stays quick: the screen swaps at once (ADR 0038) and its data comes one round after the
  click.
- No pointer handling of our own beside the router's.

## Considered options

1. Code on intent, data on opening: a route's `preload` starts its reads only when the route opens.
2. Data on intent too, as ADR 0038 has it.
3. Data on a stronger intent: the pointer resting about 100 ms on the link, or pressing it, detected by
   our own handlers in place of the router's fixed 20 ms.

## Decision outcome

Chosen option 1, by the owner on 2026-11-06. Each route's `preload` is wrapped (`onOpen` in
`apps/web/src/app/routes.tsx`) so it does nothing when the router calls it for a link the user hovered,
focused or touched (`intent` `"preload"`). On the first load, a click, and a move back or forward it starts
the reads as before. The router still loads the screen's code on intent, which asks the API nothing.

Option 2 was set aside for the reads it makes for screens nobody opens. Option 3 keeps part of the head
start, about the 100 ms between pressing and releasing, for event handling of our own and its tests.

### Consequences

- Good: the API is asked only for the screens the user opens.
- Good: one wrapper in the routes; the router's own intent handling still loads the code.
- Bad: a first visit to Members, Roles or Security waits one round after the click, its title at once over
  an empty body, and its skeleton only past `motion.waitDelay`. Revisits are drawn at once from the cache,
  as before.
- Bad: on a slow network the head start a hover gave is lost.

## Revisit when

First visits feel slow in production (then option 3, a deliberate intent), or the router lets a link ask
for a longer delay before it preloads.
