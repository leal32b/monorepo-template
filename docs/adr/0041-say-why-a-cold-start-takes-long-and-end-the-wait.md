# 0041. Say why a cold start takes long, and end the wait

- Status: accepted
- Date: 2026-11-07

## Context and problem statement

A free host puts the API to sleep when idle and wakes it in about a minute
([ADR 0014](0014-hosting-and-deploy-from-github-actions.md)). Opening the app then, the owner saw the
shell's frame with an empty side menu and an empty page, and only the thin progress bar at the top
([ADR 0035](0035-show-the-server-working-with-one-progress-bar.md)): it looked broken. The frame
(`ShellSkeleton`) drew no places for its menu or page, which [ADR 0038](0038-load-screen-data-through-router-queries-and-swap-screens-at-once.md)
says the page area should. Nothing said why it was slow, and no call had a time limit, so a server that
never answered kept the screen waiting for ever, never reaching the retry the screens already have.

What should the user see during a long wait, and when does the wait end?

## Decision drivers

- A wait looks like loading, not like a broken page, from the first moment it shows.
- A long wait says why and about how long, so the user does not leave or reload.
- A wait ends: past a point, a failure with its retry replaces it.
- One way to wait: the skeletons, the delay and the bar stay the app's; no spinner or screen of our own.
- A write is never reported as failed while it may still have happened.

## Considered options

1. Fill the frame's places, say why after a long wait with the one `Alert`, and limit reads in time.
2. A full-page "waking up the server" screen once the wait is long.
3. Keep the server awake (a scheduled ping) and change nothing on screen.
4. Limit every request in time, writes included.

## Decision outcome

Chosen option: "1", because it uses what the app already has: the family's skeleton fills the frame
(`PageSkeleton` inside `ShellSkeleton`, and a few places in the side menu), and after
`motion.slowWaitDelay` (5 s, counted from the wait's start by `createLate`) an `Alert` of kind `info`
says that the server may need up to a minute. Reads, and only reads (`GET`), go through `limitReads`, which
aborts one after `readTimeout` (90 s, a little over a cold start); the failure is the same unreachable
server every screen already says, with its retry. Option 2 hides the frame the user is about to get.
Option 3 costs a scheduled job per environment, only moves the problem, and is open to us later, beside
this. Option 4 would call a slow sign-up failed after it went through.

### Consequences

- Good: the first seconds read as loading; after five, the cause is said; after ninety, there is a retry.
- Good: no new component or motion: one more delay token, a parameter of `createLate`.
- Good: a write keeps no limit, so none is reported failed when it may have happened.
- Bad: a read that truly takes over ninety seconds fails, though the server may have answered later.
- Bad: the notice also shows when the screen's code, not the server, is slow; its words fit both.

## Revisit when

Cold starts stop (a paid always-on host), or the notice shows often for waits that are not a cold start,
or ninety seconds proves too short or too long for the host in use.
