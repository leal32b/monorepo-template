# 0035. Show the server working with one progress bar

- Status: accepted
- Date: 2026-11-04

## Context and problem statement

A screen waits for the server in three ways. Before it has anything to draw, its skeleton holds the
place (`SettingsSkeleton`, `EntrySkeleton`, `ShellSkeleton`). While an action runs, the button that
started it is pending. But once a screen is drawn, the work it does without a pending button, such as
reading a list again after a change or reading an invitation list below the people already shown, said
nothing. On a fast local stack this goes unseen; in production, with a database waking up or a slow
network, the screen looks stuck.

How does a screen that is already drawn say that the server is working, the same way everywhere?

## Decision drivers

- One idea, one presentation ([design-system](../../.claude/skills/design-system/SKILL.md)): the
  wait must not look different from screen to screen.
- No screen should have to remember to say it is waiting, or one will forget.
- No layout shift, and no flash for a quick answer.
- `prefers-reduced-motion` is honoured, as for the layers ([ADR 0031](0031-animate-layers-with-short-transform-and-opacity-motion.md)).

## Considered options

1. A spinner where each screen thinks it fits.
2. An overlay over the page while a request runs.
3. One thin progress bar at the top of the window, driven by a count of the requests both clients make.

## Decision outcome

Chosen option 3. `createRequests()` in `#shared/api` wraps the one `fetch` that the API client and
Better Auth's client both use, and counts the requests that are out, failed ones included. The app
renders `ProgressBar` from `@repo/ui` once, at its root, with `active` set to that count being above
zero, so every screen gets it, the entry screens included, and none has to call it.

The bar floats over the top of the window (`fixed`, 2px) and takes no room, so nothing moves when it
comes or goes. It shows only after `motion.waitDelay` (300 ms), the same delay the skeletons use, so
a quick answer shows nothing and a slow one shows the skeleton and the bar together. Once shown, it
stays `motion.progressMinimum` (400 ms) at least, so it never flashes. Its stripe sweeps across with
`ds-progress`, which moves only `transform`; with reduced motion it stands still and pulses its opacity.
It is decorative (`aria-hidden`): what a screen-reader user waits on already says so (a pending button,
a skeleton's status, the status line that follows a change). An `aria-busy` on `main` for every
request was left out, since some screen readers hold the status lines back while a region is busy.

The three ways now each have one case: nothing drawn yet, a skeleton; an action, its button; the
screen drawn, the bar.

Option 1 was rejected because it is a fourth way to show the same wait, placed by each screen.
Option 2 was rejected because it blocks the page and makes every wait feel longer.

### Consequences

- Good: a slow server is visible on every screen, with no code in any of them.
- Good: one delay for every wait, in the motion tokens.
- Bad: the bar is the one motion that is not a layer, an exception to ADR 0031.
- Bad: a request the user did not start (the session read again when the window regains focus) shows
  the bar too, if it is slow. It is real work, and the delay hides the quick ones.

## Revisit when

An upload or a long job needs real progress (a percentage), or users read the bar as noise.
