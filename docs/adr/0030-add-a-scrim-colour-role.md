# 0030. Add a scrim colour role

- Status: accepted
- Date: 2026-11-01

## Context and problem statement

The side drawer on phones and the command palette dim the page behind them. Both drew the veil with
`foreground` at 40% (`bg-foreground/40`). In the light theme `foreground` is near black, so the page
dims; in the dark theme it is near white, so the veil is a light grey that washes the page out instead
([ADR 0026](0026-add-surface-and-state-colour-roles.md) names 17 roles, none for this).

Which colour dims the page behind a dialog, in both themes?

## Decision drivers

- A dialog must read as in front of the page in either theme.
- Colours stay roles ([ADR 0016](0016-design-system-on-kobalte-and-unocss.md)); none is written by hand.
- Few roles, each with one job ([ADR 0026](0026-add-surface-and-state-colour-roles.md)).

## Considered options

1. Keep `foreground` at 40%.
2. `background` at 60%: it fades the page toward its own colour.
3. A `scrim` role, near black in both themes, used at 60%.

## Decision outcome

Chosen option 3: `scrim`, slate-950 in light and dark, used as `bg-scrim/60` behind a modal layer. It
has one job. Nothing is read through it, so it has no contrast minimum; a test only holds it dark.

Option 1 was rejected for the washed-out dark theme above. Option 2 was rejected because the page
would not dim in the light theme, where the dialog and the page share a ground.

### Consequences

- Good: a dialog stands out from the page in both themes with one value to maintain.
- Bad: eighteen roles; the next one needs the same test of having a single job.

## Revisit when

A dialog needs a different veil (a blur, or a tinted one), or a theme with a mid-tone ground.
