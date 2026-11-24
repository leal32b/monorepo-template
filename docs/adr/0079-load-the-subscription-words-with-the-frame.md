# 0079. Load the subscription words with the frame

- Status: accepted; amends [0071](0071-load-each-screens-dictionary-group-with-its-route.md)
- Date: 2026-11-24

## Context and problem statement

[ADR 0071](0071-load-each-screens-dictionary-group-with-its-route.md) loads each screen's dictionary group with its
route, but the frame's subscription notice and the plan refusals (a limit, read only) drew keys of the `billing`
group, so the frame named the whole group and every first signed-in download carried the plan page's words. Its
"Revisit when" named this: the group on the frame costs the signed-in budget more than 2 KB of its room. How does
the frame draw its words without carrying the plan page's?

## Decision drivers

- The first signed-in download carries only what every screen of an organization draws.
- `t(...)` keeps exact types, and every language keeps the full set of keys ([ADR 0071](0071-load-each-screens-dictionary-group-with-its-route.md)).
- A group's top-level keys cannot repeat in another group, so moved keys change their prefix.

## Considered options

1. Leave `billing` on the frame: no work, and the plan page's words keep riding on every screen.
2. Move those keys into the core (`shell`): the frame never waits, but the sign-in and every visitor's download pay
   for words only a signed-in member draws.
3. A lazy group `subscription`, named by the frame: signed-in screens get it with their route, the visitor pays nothing.

## Decision outcome

Chosen option: "3", because it removes the plan page's words from the first signed-in download without touching the
visitor's.

- `dictionaries/subscription/` holds the notice (`subscription.notice.*`), its actions (`actions.plans`, `pay`,
  `keep`), what a limit or read only refuses (`limitReached`, `readOnly`) and the plans' names (`plans`, `trial`).
  Call sites changed from `billing.…` to `subscription.…`, nothing else.
- The app frame names only `subscription`. The plan page, the activity log and the back office's organization name
  `billing` and `subscription`; customers names `subscription`.
- Measured by `bundle-budget.spec.ts`, gzipped: the first signed-in screen 119.4 KB before, 117.7 KB after; sign-in
  74.77 to 74.83 KB and the public page 78.58 to 78.63 KB (three names in the route table). The signed-in budget
  stays at 119 KB, the new measure (118) plus 1 KB.

### Consequences

- Good: the first signed-in download is 1.7 KB lighter, and the plan page's words load only with its routes.
- Bad: a screen that draws a plan word must name `subscription` (the frame already does for every organization screen).
- Bad: the saving is under the 2 KB estimated, so the signed-in budget number did not change.

## Revisit when

The `subscription` group grows past the notice and the refusals, or the signed-in budget again has less than 1 KB of room.
