# 0037. Keep one app frame across screens

- Status: accepted
- Date: 2026-11-05

## Context and problem statement

Each app screen drew its own `AppShell`: the side menu, the phone drawer, the top bar, the command
palette and the service status, then its title and content. Moving between screens made all of it
again. The service status asked `/api/health` on every screen, the side menu was rebuilt, and the
phone drawer, being a new one each time, needed a module-level handoff to stay open on the way to the
settings. [ADR 0036](0036-keep-the-screen-until-the-next-one-is-ready.md) removed the blank frame
between screens but left this.

How do the screens share one frame that stays, without each screen knowing about it?

## Decision drivers

- What does not change between screens is not drawn again.
- A screen still owns its title, its content and the focus on its `h1`.
- The frame's parts follow the screen on view: its title in the breadcrumb, its organization at the
  top of the side menu and in the palette.
- Pages that are not app screens (a guard's "not found", its "could not load", its placeholder) still
  draw themselves whole.
- Page tests stay as they are.

## Considered options

1. One `AppFrame` route above the account settings and the organization's screens; each screen an
   `AppShell` that tells the frame its title and organization.
2. Titles and organizations declared on the routes, read by the frame from the matches.
3. Keep a shell per screen, and cache the service status.

## Decision outcome

Chosen option 1. The routes put `/settings/*` and `/:orgSlug/*` under one `AppFrame`, below the
organizations and the session's `Suspense`. The frame draws the side menu, the drawer, the top bar and
the palette once, and reads the service status once. Each screen is an `AppShell`: it comes into the
frame with its title and its organization, draws its own `main` with the `h1`, and leaves on unmount.
The frame shows the last screen to come in. While none is in, as when the organization guard shows
"not found", the frame stands aside and that page draws itself whole, as before.

Two details make it hold under the router's transitions:

- A screen leaves while the transition commits, and the transition's own value of the list of
  screens, written as the next one came in, would overwrite a removal made then. The removal waits
  a microtask, after the commit.
- The organization a screen gives the frame is a memo, which keeps its last value once the screen has
  left, where the guard's context would throw. The switcher takes it as a prop.

The phone drawer now lives as long as the frame. It closes when the screen changes, however it changed
(a link in it, the back button, the palette), except when its own account menu goes to the settings,
which says so first. The module-level handoff is gone. An `AppShell` with no frame around it, as in a
page test, draws one of its own.

Option 2 was rejected because the titles come from the dictionaries and the organization from the
guard below the frame, so the routes would need to know both. Option 3 was rejected because it keeps
rebuilding the menu and the drawer.

### Consequences

- Good: moving between screens changes only `main` and the title; the menu stays where it was.
- Good: one `/api/health` per session, not per screen.
- Bad: the frame learns of screens through their lifecycle, which the microtask and the memo keep
  correct under transitions; a regression test covers the path that broke without them.
- Bad: an `AppShell` outside a frame quietly draws one, so a screen left outside the frame route still
  works, with the old cost.

## Revisit when

A screen needs a part of the frame of its own (actions in the top bar), or Solid's transitions change
how cleanups and writes are ordered.
