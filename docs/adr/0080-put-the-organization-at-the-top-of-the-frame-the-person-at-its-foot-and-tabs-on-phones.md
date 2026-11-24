# 0080. Put the organization at the top of the frame, the person at its foot, and tabs on phones

- Status: proposed
- Date: 2026-11-24

Amends [ADR 0037](0037-keep-one-app-frame-across-screens.md): the frame keeps its side menu and its
palette, and loses its top bar and its phone drawer.

## Context and problem statement

The frame of ADR 0037 holds a side menu (the organization's switcher on top, the product's screens,
the account's menu at the foot), a top bar (a breadcrumb, the search) and, on phones, the same side
menu in a drawer. A visual review on 2026-11-24, at 375×812 and on the desktop, found:

- The organization's settings are reached through the person's menu: "Settings" in the account's menu
  opens the profile, and Members or Plan are one more click away. Two owners share one door.
- Entering the settings replaces the whole side menu: the organization's name and the product's
  screens go away, and "Back to the app" does not say where it goes back to. The person's settings
  are listed before the organization's, which are the ones a manager comes for.
- On the desktop the top bar holds a breadcrumb of one step that repeats the `h1` below it, and the
  search; nothing in it is needed.
- On phones a hamburger hides two destinations, the top bar shows the template's name rather than the
  organization's, and the person is at the bottom of the drawer.
- The two menus of the side menu (organization, person) look alike and say nothing of whose they are.

Where does each part of the navigation live, so that each owner has one place on every screen and
every width?

## Decision drivers

- One owner, one place: what belongs to the organization (switch, invite, its settings) opens from its
  name; what belongs to the person (profile, security, preferences, sign out) opens from theirs. No menu
  mixes the two.
- The same places on the desktop and on phones, and in the settings as anywhere else.
- Nothing on screen that the user does not need: a breadcrumb of one step, a bar that repeats a title.
- On phones the destinations are within the thumb's reach, in view, not behind a button.
- No new idea where the design system has one: the two menus are `Menu` with `MenuTriggerContent`, the
  organization's `Avatar` square and the person's round; the page's actions stay on its rows
  (`ListRow` + `PanelButton`).

## Considered options

1. **Keep the frame, move two links.** Put a "Settings" link in the side menu and leave the rest.
2. **A frame by owner.** The organization at the top of the side menu, the person at its foot, the
   product's screens and the search between them; no top bar on the desktop; on phones a top row with
   the organization and a tab bar at the bottom whose last tab is the person.
3. **A top navigation bar.** The product's screens as tabs across the top, the organization and the
   person as menus at its two ends, and the same drawer on phones.

## Decision outcome

Chosen option: "2", because it gives each owner one place that holds at every width, and removes two
parts of the frame instead of adding one. Option 1 leaves the person's menu as the door to the
organization's settings and the top bar as it is. Option 3 runs out of room as modules are added, and
keeps the drawer on phones.

**Desktop (from `md`).** The side menu, 16 rem, from top to bottom:

- The organization's menu (its logo or initials, its name): a header with the plan and the number of
  members, then "Invite people", "Organization settings", the organizations to switch to, and "Create
  organization". Outside any organization it shows the product's name and opens the onboarding.
- The search, a row that opens the command palette (⌘K).
- The product's screens.
- At the foot, the person's menu (round avatar, name): a header with the name and email, then
  "Profile", "Security", "Preferences", and "Sign out".

There is no top bar. A screen's header is its `h1` and, where it has one, its description; its
actions stay on its rows. A screen deeper than one level (a record's own page, when one exists) draws
a back link above its `h1`, named after the screen it returns to.

**Settings.** The side menu keeps its top and its foot. Between them, the product's screens give way
to a link back, named after the last product screen of this organization the user was on ("Back to
Customers", else "Back to Home"), and two groups: the organization's first (General, Members, Roles and
permissions, Plan and billing, Activity), then "Your account" (Profile, Security, Preferences). The URLs
of [ADR 0034](0034-keep-the-organization-slug-in-the-web-url.md) stay. An operator's visit lists only
the settings it can read, as ADR 0077 says.

**Phones (below `md`).** A top row with the organization's menu, the same menu as on the desktop. A
tab bar fixed at the bottom, above the safe-area inset, with the product's screens, "Search" (which
opens the palette) and "You", the person's avatar. Five tabs at most: up to three of the product's
screens, then Search and You. With more screens, the third tab becomes "Modules" and lists the rest
in the side menu's order. The "You" tab is a screen with the person's three settings and "Sign out".
On phones `/settings` and `/:orgSlug/settings` are screens that list their group's settings, and each
settings screen links back to that list; on the desktop they still open the first setting.

The product's screens are one list, read by the side menu and the tab bar, so a module adds itself in
one place (the `new-module` skill says where). The subscription's notice (ADR 0068) and the operator's
banner (ADR 0077) keep their places. The frame's skeleton draws the same places: the side menu on the
desktop, the top row and the tab bar on phones.

### Consequences

- Good: the organization's settings are one click from anywhere, under its name; the person's are
  under theirs. The settings no longer hide the organization.
- Good: the desktop gains the top bar's 56 px for content; phones show every destination without a
  tap, and the organization's name instead of the template's.
- Good: the frame loses two parts (top bar, drawer); `Sheet` leaves `@repo/ui` if nothing else uses it.
- Bad: no breadcrumb. A screen two levels deep must draw its own back link; one trail across many
  levels would need a decision of its own.
- Bad: on phones the tab bar takes about 76 px at the bottom of every screen, and a product with more
  than three main screens reaches the rest in two taps.
- Bad: the settings' back link needs the frame to remember the last product screen of each
  organization, a small state the frame did not have.
- Bad: every end-to-end test that opens the drawer or the account menu to reach the settings changes.

## Revisit when

A product has more than five main screens that its users visit daily, screens nest more than two
levels deep, or support hears that people cannot find the settings or switch organizations.
