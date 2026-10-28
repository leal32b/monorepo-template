# 0017. Build the web UI from the design system first

- Status: accepted
- Date: 2026-10-28

## Context and problem statement

The design system ([ADR 0016](0016-design-system-on-kobalte-and-unocss.md)) is only worth its
guarantees (accessible behaviour, contrast held to WCAG) where the app uses it. Nothing stops a
screen from importing Kobalte directly or writing a hex colour, and each shortcut leaks a guarantee.
How is "use the design system" kept as screens are added?

## Decision drivers

- A missing component is built once, in the design system, where it is tested.
- The rule is checked by the definition of done, not by memory or review.
- A failure says what to do instead.
- No new tool.

## Considered options

1. A convention in AGENTS.md, caught in review.
2. A lint plugin with custom rules.
3. Checks on tools that already run: a dependency-cruiser rule, a Vitest test over the web source,
   and a preset that has no colour but the roles.

## Decision outcome

Chosen option 3.

- The web app composes `@repo/ui`. When a component is missing, it is added to `packages/ui`,
  with its tests, not built in the app.
- `web-composes-the-design-system` (dependency-cruiser) forbids `@kobalte/*` in `apps/web`. The
  import already fails as undeclared, but that message suggests declaring the dependency; this one
  names the intent.
- Colours: the preset offers only the roles, so a palette utility paints nothing, and
  `apps/web/src/colours.test.ts` fails on a colour written by hand (hex or a CSS colour function,
  in a class, a `style` or a stylesheet), listing file and line.
- Layout, spacing and typography utilities stay free in the app: the design system owns colour and
  components, not page composition.

### Consequences

- Good: drift fails the definition of done with a message that points to the design system.
- Good: no new dependency; the checks run where the other gates already run.
- Bad: the colour test is a regular expression: a string such as `'#add'` that is not a colour
  would be flagged, and a colour built at runtime would slip through.
- Bad: a palette utility in the app fails silently (no CSS) instead of failing a check.

## Revisit when

The colour test flags non-colours or misses real ones (move to a lint rule), or a second app
consumes the design system (apply both checks to every app, not only `apps/web`).
