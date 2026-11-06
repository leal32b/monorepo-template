# 0039. Draw every signed-in screen in the one frame

- Status: accepted
- Date: 2026-11-05

## Context and problem statement

[ADR 0037](0037-keep-one-app-frame-across-screens.md) put the account settings and the organization's
screens under one `AppFrame` route, drawn once. The start (`/`), onboarding and the invitation page stayed
outside it, as entry screens. A review of the web app on 2026-11-05 (finding W08) measured what that cost
someone who already has an organization: the switcher's "Create organization" removed the side menu and
the top bar, showed a blank page until the invitations arrived, and on the way back built a new frame and
asked `/api/health` again. Going back to the app from the account settings, and deleting, leaving or
joining an organization, went through the start, outside the frame, and rebuilt it too.

Where do onboarding and an invitation sit for someone who has an organization, and for someone who has
none yet?

## Decision drivers

- The frame of a signed-in user is never rebuilt between their screens; the side menu stays the way
  around.
- Someone without an organization has nothing for the frame to show: their first steps keep the entry
  screens' narrow column.
- One address per screen: the switcher, onboarding's list of invitations and the invitation email keep
  their links.
- What a screen shows stays the same in either place; only the frame around it differs.
- No new route, dependency or concept beyond what the frame already has.

## Considered options

1. One frame route above every screen behind the session; onboarding and an invitation are app screens
   for someone who has an organization and entry screens, the frame aside, for someone who has none.
2. Keep them outside the frame, as entry screens for everyone, and accept the rebuild.
3. Two routes per screen: one inside the frame for someone who has an organization (such as
   `/organizations/new`), the entry one for the rest.

## Decision outcome

Chosen option 1, by the owner on 2026-11-05 (D3 of the review).

The routes put the start, `/onboarding` and `/invitations/:id` under the same `AppFrame` as the settings
and the organization's screens. Both screens ask the organizations provider whether the user has an
organization (`hasOrganization`): yes draws them as an `AppShell`, no as an `EntryLayout`, with which the
frame stands aside as it does for "not found". Until the list is first read, as on a cold load of the
email's link, the session's skeleton holds the place; the list is read at boot beside the session, so this
costs no round. A list that could not be read draws the entry screen, which works without it.

In the frame:

- Onboarding is "Create an organization": its line under the title, the form at once, and the invitations
  after it once read, with no placeholder since most people have none; a failure to read them is said in
  their place, and the form still works. The way back is the side menu, so the page's "Back to app" goes.
- Each case of an invitation is an app screen: its title, its one line and its actions. The entry screen's
  "Signed in as … Use another account" is left to the account in the side menu; a pending invitation is
  always for the account signed in, and another address is its own case.
- `AppShell` takes a `description`: one line under the title, for a screen that is one message and its
  actions.
- The actions of both screens sit in `FormActions`, which follows its width: across the entry column, at
  their own width in the app's.

The start keeps the frame while it decides where to go: it draws the skeleton of the organization it
opens beside its redirect, since the redirect may commit apart from the screen it opens, and while the
organizations are read again (one just created, deleted, left or joined) a skeleton waits for the new list
in the frame. Its first read, before anything is drawn, waits as the session does. The organization guard,
the switcher and these screens read the list as last read while it is read again (`known`), so the screen
on view stays.

Option 2 was rejected because it keeps the rebuild W08 measured. Option 3 was rejected because one screen
would have two addresses, and the links in the switcher, in onboarding and in the email would have to
choose between them.

### Consequences

- Good: moving between a signed-in user's screens never rebuilds the frame, and the service status is
  asked once per app session ([ADR 0038](0038-load-screen-data-through-router-queries-and-swap-screens-at-once.md)).
- Good: creating another organization no longer waits on the invitations, and a failure to read them no
  longer blocks the form.
- Good: a first organization and an invitation opened right after signing up keep the entry screens.
- Bad: two screens have two presentations, chosen by a fact read at boot; a page test covers each.
- Bad: on a phone the way back from onboarding is the menu in the top bar, not a link on the page.
- Bad: the start puts a skeleton in the frame for the moment it redirects, so a slow redirect shows the
  organization's skeleton rather than nothing.

## Revisit when

A screen outside any organization needs a part of the frame of its own, onboarding grows into steps that
read better without the frame, or the organizations stop being read at boot (a `GET /api/me`, ADR 0038).
