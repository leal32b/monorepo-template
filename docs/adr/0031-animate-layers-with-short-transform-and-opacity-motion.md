# 0031. Animate layers with short transform and opacity motion

- Status: accepted
- Date: 2026-11-01

## Context and problem statement

The design-system skill said colour transitions were the only animation. That suits buttons and
fields, but not a layer that comes and goes: the phone drawer, the command palette, the account menu
and the status popover appeared and vanished at once, which reads as abrupt, and gives no sense of
where a panel came from. A form that opens inside a settings row had the same jolt.

Which motion do layers get, and how is it kept from costing speed, layout or accessibility?

## Decision drivers

- A layer should show where it comes from and where it goes, so the user keeps their place.
- Quick: the user is waiting to act, so no motion is felt as a wait.
- No layout shift: motion must not move what is around the layer ([design-system](../../.claude/skills/design-system/SKILL.md)).
- `prefers-reduced-motion` is honoured (WCAG 2.2, 2.3.3).
- One place for the values, as roles are for colour ([ADR 0016](0016-design-system-on-kobalte-and-unocss.md)).

## Considered options

1. No motion, as before.
2. Motion written in each component, with Tailwind-like `transition` and `animate-` utilities.
3. A few named motions in the preset, played from the `data-expanded` and `data-closed` attributes
   Kobalte puts on its layers, with durations and easing as tokens.

## Decision outcome

Chosen option 3. The preset carries `ds-scrim` (the veil fades), `ds-sheet` (a panel slides from the
left), `ds-dialog` (a dialog lifts a little as it fades), `ds-pop` (a menu or popover grows from its
button, by the transform origin Kobalte computes) and `ds-reveal` (a form that opens in a page fades
in). The durations are in `packages/ui/src/motion/motion.ts`: 200 ms in and 150 ms out for the drawer
and its veil, 150 and 100 for the dialog, 120 and 80 for a menu, 120 for a reveal; easing out on the
way in and in on the way out.

Only `transform` and `opacity` change, so nothing around a layer shifts and the browser can animate
them on the GPU. With `prefers-reduced-motion: reduce` every motion becomes a fade. Kobalte keeps a
layer in the DOM until its exit animation ends, so leaving is animated too; a test holds that the
motions are the tokens' and that nothing else moves.

Option 1 was rejected as the abruptness was the complaint. Option 2 was rejected because durations
would drift between components and reduced motion would be handled in each.

### Consequences

- Good: layers feel connected to what opened them, with one set of values to tune.
- Good: reduced motion is handled once, in the preset.
- Bad: a layer centred with a `translate` utility would have it overwritten by the animation; the
  palette is centred with `inset-x-4 mx-auto` for this reason, and the skill says so.
- Bad: a form that opens in a row fades in but does not animate out, since the row simply loses it.

## Revisit when

A layer needs a different motion (from the right, from below), or users report motion as slow.
