# 0036. Keep the screen until the next one is ready

- Status: superseded by [0038](0038-load-screen-data-through-router-queries-and-swap-screens-at-once.md)
- Date: 2026-11-05

## Context and problem statement

Going from the account settings to an organization's settings, the whole screen went blank for a
moment and was drawn again: the side menu, the top bar and the page. The organization guard
(`RequireOrganization`) mounts on the way in and asks the API for the caller's membership; until the
answer came it drew its fallback, the shell's skeleton, which stays invisible for its first 300 ms
([ADR 0035](0035-show-the-server-working-with-one-progress-bar.md)). Switching organizations, and
opening a screen whose code is loaded on demand for the first time, went blank the same way.

Solid's router already moves in a transition, which can keep the current screen until the next is
ready. But a transition only waits on what is read under a `Suspense` boundary that has already shown
its content, and the app had none.

How does the app move between screens without a blank frame, without each screen handling it?

## Decision drivers

- Coherence: moving between screens must not look like a page reload.
- No layout shift, and no flash for a quick answer ([design-system](../../.claude/skills/design-system/SKILL.md)).
- The first load keeps the shell's skeleton, since there is no previous screen to keep.
- Nothing per screen: the rule must hold for screens not written yet.

## Considered options

1. One `Suspense` under the session guard, with the guards reading what they wait on, so the router's
   transition keeps the previous screen; plus the memberships kept for the session.
2. One shell that stays mounted across every screen, with only `main` showing a placeholder.
3. Prefetch the membership of every organization when the list is read.

## Decision outcome

Chosen option 1. `RequireSession` puts the screens below it in one `Suspense`, whose fallback is the
shell's skeleton: the first time, it draws the frame while what they need comes. Once it has shown its
content, every navigation keeps the screen on view until the next is ready, the progress bar showing if
it is slow. `RequireOrganization` reads the membership (not only checks its state), so the transition
waits on it. Lazy screens wait the same way, with no code.

`OrganizationsProvider` keeps each membership read in the session, by organization id. Going back to an
organization draws at once and asks the API again behind it: a new answer replaces the old; a 404 (no
longer a member) reads it for real, which shows "not found"; any other failure keeps what is known. A
late answer about an organization the screen has left is dropped. The memberships go with the session.

The rest of the screens keep reading their resources through `state === 'ready'` or `latest`, which
does not suspend: a list read again after a change keeps its rows and shows the progress bar, instead of
the whole tree falling back to the skeleton. A guard that reads a resource directly does suspend when it
loads outside a navigation (the membership asked again after an error), which is acceptable there, as
the whole screen is the error.

> Correction (2026-11-05, [0038](0038-load-screen-data-through-router-queries-and-swap-screens-at-once.md)): `latest` suspends too until the resource has its first
> value; only after that does it keep the last value without suspending. Screens that read `latest` held
> the previous screen on their first visit, and their own skeletons were never shown.

Option 2 was set aside for now: each screen draws its own `AppShell`, so moving the shell up is a
larger change of layout; it would also stop the side menu and the service status being made again on
each screen. Option 3 was rejected: it asks the API once per organization the user has, for screens they
may never open.

### Consequences

- Good: no blank frame between screens, entering, leaving or switching organizations.
- Good: going back to an organization is instant.
- Bad: the address bar shows the new address a moment before the screen does; this is how the router's
  transition works, and the progress bar covers a slow wait.
- Bad: a membership changed elsewhere shows on a revisited organization only once the check behind
  answers; the API enforces every action anyway (ADR 0033).
- Bad: tests that look at the address after a redirect wait for it, since the transition sets it last.

## Revisit when

The shell was made persistent (option 2) in [ADR 0037](0037-keep-one-app-frame-across-screens.md). Revisit when a screen needs to read
a resource directly where a refetch would make the whole tree fall back.
