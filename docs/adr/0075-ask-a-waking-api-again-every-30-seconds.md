# 0075. Ask a waking API again every 30 seconds

- Status: accepted
- Date: 2026-11-20

Amends [ADR 0062](0062-wait-in-the-worker-while-the-host-wakes-the-api.md) in one number: the Worker
waits 30 s, not 3 s, between two asks while the host wakes the API. The deadline of 80 s stays.

## Context and problem statement

ADR 0062 has the Worker send a request again while Render answers `429` with `X-Render-Routing:
hibernate…`, every 3 s up to 80 s. A free instance takes tens of seconds to wake, so each request the
page makes during a wake is sent a dozen times or more, and a screen that starts several reads
multiplies that. How often should the Worker ask again?

## Decision drivers

- Few requests to the host while it wakes, since every one of them is refused anyway.
- A sleeping API still reads in the browser as one slow request that ends before the web's 90 s.
- Nothing changes on the screens: ADR 0041's notice already says why the wait is long.

## Considered options

1. Every 3 s, as ADR 0062 chose.
2. Every 30 s, chosen by the owner.
3. A growing wait (3 s, 6 s, 12 s…).

## Decision outcome

Chosen option: "2". Under the 80 s deadline a request is sent at most three times: at once, after
30 s and after 60 s. Option 1 sends many requests that the host refuses. Option 3 saves requests too,
but adds a rule to tune for the same effect.

### Consequences

- Good: a wake costs the host at most three requests for each request the page makes.
- Bad: an API that wakes just after an ask is seen up to 30 s later, so a cold start can read up to
  30 s slower than with option 1.
- Bad: the last ask is at 60 s; an API that wakes between 60 s and 80 s is not seen, and the screen
  shows its failure and its retry.

## Revisit when

Wakes take longer than 60 s, users report cold starts slower than the host's own wake, or the API
moves to an instance that never sleeps.
