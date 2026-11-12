# 0062. Wait in the Worker while the host wakes the API

- Status: accepted
- Date: 2026-11-12

## Context and problem statement

[ADR 0041](0041-say-why-a-cold-start-takes-long-and-end-the-wait.md) has the web wait for a sleeping API:
the skeleton, a notice after 5 s that the server may need a minute to wake, and a failure with its retry
after 90 s. It rests on the host holding the first request until the API is up.

Render no longer does so for the Worker's requests. While it wakes a free service it answers them at once
with `429 Too Many Requests`, `text/plain`, and `X-Render-Routing: hibernate-rate-limited`
([Render: 429](https://render.com/docs/troubleshooting-deploys)); a browser that opens the API's address
gets Render's loading page instead. The request never reaches the API, and the wake goes on. The app saw a
failed session read in milliseconds, said "We could not check your sign-in", and every "Try again" within
the wake got the same answer. Anyone opening the template's deploy after a quiet time met it.

How does a request that arrives while the API wakes end as the one slow request ADR 0041 expects?

## Decision drivers

- A visitor at any moment, on a sleeping free host, sees the wait of ADR 0041, not an error.
- Nothing the API answers changes meaning: its own 429 (Better Auth's, ours) still reaches the browser.
- A write is sent again only when it is known not to have reached the API.
- The fix lives where the host is known, not in every screen.

## Considered options

1. The Worker sends the request again while Render answers that it is waking, until a deadline below the
   web's `readTimeout`.
2. Each screen retries a 429 that says `hibernate`, with its own wait.
3. Keep the API awake with a scheduled ping.
4. A paid instance that never sleeps.

## Decision outcome

Chosen option: "1". `proxyToApi` reads the body once, sends the request, and while the answer is a 429
whose `X-Render-Routing` starts with `hibernate` it waits 3 s and sends it again, up to 80 s, under the
web's 90 s for a read. Past that it returns Render's answer, which the screen says as a failure with its
retry. Writes are sent again too: Render refused them before the API saw them. Option 2 spreads a host's
quirk over every screen and the auth client. Option 3 is a scheduled job per environment that someone who
copies the template must set up, and it spends the free hours; [operations.md](../operations.md) keeps it
as an option. Option 4 is a product's choice, not the template's.

### Consequences

- Good: a sleeping API reads in the browser as one slow request, so ADR 0041's skeleton and notice show
  again, and the screens change nothing.
- Good: a 429 of the API itself still reaches the browser at once.
- Bad: the body of every write is read into memory before it is sent (the API takes 1 MiB at most).
- Bad: the Worker knows one host's header; another host's way of saying it is waking needs its own rule.
- Bad: during a wake, each request the page makes is sent every 3 s, a few more requests to Render.

## Revisit when

The API moves off Render or to an instance that never sleeps, Render changes how it answers during a wake,
or a wake takes longer than the deadline.
