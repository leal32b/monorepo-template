# 0068. Say the subscription once per screen, and open the plan page to every member

- Status: proposed
- Date: 2026-11-13

Amends [ADR 0063](0063-subscribe-each-organization-through-a-billing-port-and-check-entitlements-not-plans.md)
in two places: the settings menu shows the plan page to every member, and the plan page waits for the
provider by reading its own read rather than the membership. Raises the budgets of
[ADR 0045](0045-run-the-end-to-end-suite-on-the-built-app-without-outside-services.md) by 1 KB each, and
records that the revisit signal of [ADR 0058](0058-split-the-i18n-dictionaries-by-slice-and-merge-them-per-language.md)
has fired.

## Context and problem statement

ADR 0063 says what each screen says of a subscription, and ADR 0067 names the routes the web calls. Building
the web (P0-6, slice 2) and walking every state in the browser met questions neither answers, and two places
where following 0063 as written reads worse than it should:

- 0063 has the menu show the plan page only to whoever holds `billing:manage`. Every other entry of the
  organization's settings (members, roles, activity) shows to every member, and the screen says what a role
  cannot do there; the side menu does not know the caller's permissions on an account screen, where it lists
  the organization's settings too. A member who meets a limit or read only also has nowhere to read which
  plan the organization is on and who to ask.
- 0063 shows the state in the frame "above every screen". On the plan page the rows already say where the
  subscription stands; with the frame's notice a late payment was said three times on one phone screen.
- 0063 has the way back from the provider read the membership every 3 seconds. The page draws from its own
  read (`GET …/billing`), which also holds the open checkout and the version.
- 0063 lists "Change payment when the provider has a page for it", and 0067 makes it a checkout of the
  current plan for Asaas, which has none. That checkout is a new subscription at the full price, charged at
  once while the period already paid for runs on.
- The plan's words, in three languages, add 1 KB gzipped to every cold load, past the budgets of ADR 0045.
- The tenant guard's membership is held by the guard, not read with `createRead`, so `readAgain` cannot
  reach it after a change of plan.

## Decision drivers

- One idea, one presentation (the design-system skill): the state is said once on each screen.
- A member who cannot manage the plan can still find out what it is and who manages it (ADR 0063,
  "Permission").
- Nothing charges the owner twice for one period without saying so before the button.
- What the web holds is for drawing only; the API decides (ADR 0063).
- The budgets of ADR 0045 hold, or a raise is written down.
- Small changes to what other screens rely on.

## Considered options

Who sees the plan page:

1. Every member, in the menu and the palette; the page shows the plan, what each plan includes and who
   manages it, and only the owner gets its controls and its billing read.
2. Only whoever holds `billing:manage`, as 0063 wrote.

Where the state is said:

a. In the frame's notice on every screen of the organization but the plan page, which says it in its rows.
b. In the frame's notice on every screen, the plan page included.

How the way back waits:

i. Read the plan page's own read every 3 seconds for up to a minute, and the membership once it changed.
ii. Read the membership every 3 seconds, as 0063 wrote, and the plan page's read when it changed.

"Change payment":

x. Not offered yet.
y. A checkout of the current plan now, as 0067 allows.

The budgets:

A. Raise each by the measured 1 KB, and leave the split of the dictionaries to a change of its own.
B. Load the signed-in dictionary groups with their routes now (ADR 0058, option 4).

## Decision outcome

Chosen options: 1, a, i, x and A.

- **The plan page is every member's.** `/:orgSlug/settings/billing` is in the settings menu and the palette
  for everyone, like the organization's other settings. The owner sees the page of 0063 and 0067. Another
  member sees the plan and where it stands, what each plan includes, and "Who manages the plan" with the
  owners' names from the members list, which every member may read; when that list cannot be read, the row
  says "an owner of" the organization. The route asks for the billing read only for the owner, once the
  membership the frame reads says so (ADR 0042), and for the members list otherwise.
- **The state is said once per screen.** The frame's notice is an `Alert` that `AppShell` draws below the
  title of every screen of an organization, from the membership the screen already has, so it arrives with
  the screen. It lives in the app shell widget, its only user, not in the subscriptions entity, so the first
  screen does not load the plan page's code. The plan page draws none: its first row says where the
  subscription stands (a badge and a line), and a row for each thing open says what to do about it.
- **A screen can read the membership again.** The tenant guard hands the screens below it `refresh()` on
  `CurrentOrganization`, which asks the API behind the screen and never fails; the plan page calls it after
  every change, and a write refused by the plan calls it, so the frame's notice and the limits follow.
- **The way back reads the plan page's read.** With `?checkout=returned` and a payment open, the page reads
  `GET …/billing` every 3 seconds for up to a minute, says the payment confirmed, not made, or still to come,
  and reads the membership once when it changed. The address loses `?checkout=` at once. What the owner does
  next on the page replaces what it said.
- **"Change payment" waits.** The owner can still pay what is late ("Pay now": the provider's page, or a new
  checkout of the plan when it has none, as 0067 says). Changing how to pay while nothing is late is offered
  once a provider has a page for it, or once the owner decides what a replacing subscription should charge
  for the days already paid.
- **Refusals before they happen, and after.** While read only, every write of a row is drawn disabled with
  "Read only until the plan is paid" in its note, deleting stays open; once the active list reaches the
  plan's limit, adding waits with the limit's words. A refusal that still comes keeps what was typed and says
  the same words, with "See plans" for the owner. A 409 of the billing routes closes its panel, is said below
  its section in words of its own, and the page reads again; a provider out of reach (503) keeps the panel
  open to try again.
- **The budgets.** 78 KB before sign-in and 118 KB before the first signed-in screen, each 1 KB more,
  measured with the billing texts in every language chunk. ADR 0058's signal ("less than 2 KB of room") has
  fired: the next change that adds texts loads the signed-in groups with their routes first.

### Consequences

- Good: every member can read the plan and who to ask; the owner alone sees money, versions and the
  provider's reference.
- Good: no screen says the same state twice, and the frame's notice costs the first screen about 0.6 KB.
- Good: the way back waits on what the page draws, and the frame follows every change through one refresh.
- Good: nothing offered can charge a second full period while one is paid, until someone decides it should.
- Bad: the plan page is one more settings entry for members who can do nothing there but read.
- Bad: with Asaas, an owner who wants to change how they pay while nothing is late has no button yet.
- Bad: while read only, a list screen repeats its note on every row, as 0063 asks.
- Bad: every cold load carries 1 KB more, and the budgets have no room left until the dictionaries split.

## Revisit when

The first real provider has a page for changing how to pay, or the owner decides what a replacing
subscription charges (then "Change payment"). A product hides settings by permission in the menu (then
reconsider who sees the plan page). The next group of texts lands, or a cold load passes a budget again (then
ADR 0058's option 4).
