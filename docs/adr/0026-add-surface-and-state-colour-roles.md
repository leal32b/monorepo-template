# 0026. Add surface and state colour roles

- Status: accepted
- Date: 2026-11-01

## Context and problem statement

The app shell ([plan](../design/app-shell-plan.md)) has a side menu set apart from the page, settings
pages made of bordered groups of rows, and state shown as text: a badge that says a feature is on, a
line that says the service is slow. The roles of [ADR 0016](0016-design-system-on-kobalte-and-unocss.md)
have one background, one `border` (slate-500, held at 3:1 because it outlines inputs) and
`destructive` as the only state colour. A side menu on `secondary` would read as a button, a group
outlined with `border` looks as heavy as a field, and "on" in `foreground` says nothing at a glance.

Which roles do the shell and the settings pages need, and what are they held to?

## Decision drivers

- Colours stay roles, held to WCAG 2.2 by `tokens.test.ts` (ADR 0016).
- Restraint: as few roles as the prototype needs, each with one job.
- A control's outline and an area's frame look different, so a field still reads as a field.
- State is never told by colour alone (WCAG 1.4.1): a badge has a word, the colour only helps.

## Considered options

1. Reuse the roles there are: `secondary` for areas, `border` for groups, `primary` and
   `destructive` for state.
2. Opacity on the roles there are (`bg-foreground/5`, `border-border/30`).
3. Four new roles: `surface` and `border-subtle` for areas, `success` and `warning` for state.

## Decision outcome

Chosen option 3.

| Role | Light | Dark | For | Held to |
| --- | --- | --- | --- | --- |
| `surface` | slate-50 | slate-900 | areas set apart from the page: the side menu | text on it 4.5:1, the focus ring 3:1 |
| `border-subtle` | slate-200 | slate-800 | frames and dividers: a section's group, between rows, the side menu's edge | none (decorative) |
| `success` | green-700 | green-400 | state text: "On", "All systems normal" | 4.5:1 on `background` and `surface` |
| `warning` | amber-700 | amber-400 | state text: "Service is slow" | 4.5:1 on `background` and `surface` |

`border` stays for controls (inputs, outline buttons) and keeps its 3:1. `border-subtle` has no
minimum because nothing is found by it: the rows and their labels say what the group holds.

Option 1 was rejected because `secondary` is a button's background and `primary` the one action of
a view, so either would mean two things. Option 2 was rejected because an alpha colour has no
fixed value: its contrast depends on what is under it, and the test could not hold it.

### Consequences

- Good: the shell and settings are drawn from roles, and every new text pair is in the contrast test.
- Good: a field still stands out from the group around it.
- Bad: thirteen roles become seventeen; each new one must keep a single job, or it is not added.
- Bad: `success` and `warning` on `surface` in light are 4.8:1, near the line; a lighter surface
  or a darker shade can tip them, and only the test will say.

## Revisit when

A screen needs a state with a filled background (a banner, a solid badge), which needs
`success-foreground` and `warning-foreground` pairs, or a third area level appears (a card on the
side menu), which asks whether `surface` should become a scale.
