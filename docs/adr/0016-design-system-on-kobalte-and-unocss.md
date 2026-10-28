# 0016. Build the design system on Kobalte and UnoCSS, consumed from source

- Status: accepted
- Date: 2026-10-28

## Context and problem statement

Every SaaS built from the template needs buttons and form fields that are accessible, consistent
and readable in light and dark. Written screen by screen, focus handling, ARIA wiring and colour
contrast drift apart. Where do the components live, what gives them behaviour and look, where do
colours come from, and how do the apps consume them?

## Decision drivers

- Accessible behaviour (focus, labels, descriptions, invalid state) without hand-written ARIA.
- One source of truth for colour; contrast is checked by a test, not by eye.
- No build step for the package: apps and tests read its source, like `@repo/contracts`.
- Small: only what the tracer bullet uses (Button, Input, Field), grown on demand.
- Fits Solid and generates only the CSS a page uses.

## Considered options

1. Components in the web app's `shared/ui`, with hand-written ARIA and plain CSS.
2. A styled component library, themed to fit.
3. A `packages/ui` on Kobalte (unstyled, accessible Solid primitives) and UnoCSS (`presetWind4`),
   with tokens as a TypeScript object that the UnoCSS preset emits as CSS variables.

For the tokens alone: JSON design tokens built by Style Dictionary, or a TypeScript object.

## Decision outcome

Chosen option 3, with tokens as a TypeScript object.

- **Behaviour** comes from Kobalte: `Button` on its Button (`type="button"` by default), `Field`
  on its TextField (label, hint and error wired to the input). `Input` is a native input with the
  same look, for an input without a visible label.
- **Look** is UnoCSS utilities. Variants live in `.ts` files (`cva`), so they count towards the
  100% coverage, which keeps measuring `.ts` only; `cn` (clsx + tailwind-merge) lets a passed
  `class` override the component's own.
- **Tokens** are a private palette and, per theme, a role → palette map typed with `satisfies`, so
  a role can only point at a palette colour. `tokens.test.ts` holds every pair the components use
  to WCAG 2.2 (4.5:1 for text, 3:1 for borders and the focus ring).
- **The preset** (`@repo/ui/preset`) declares each role as `--ds-<role>` (light in `:root`, dark
  under `prefers-color-scheme: dark`), paints `body`, and replaces Wind4's palette with the roles:
  `bg-primary` exists, `bg-blue-600` generates nothing; `transparent`, `current` and `inherit`
  remain.
- **Consumed from source**: the package exports `src/` under a `solid` condition, which
  vite-plugin-solid needs to compile Kobalte's JSX in the web tests. The app's `uno.config.ts`
  scans `.ts` files too, since the Vite plugin ignores `content` set inside a preset.
- The preset is tested with `@unocss/core` and `@unocss/preset-wind4`; the umbrella `unocss`
  package pulls in native parser bindings that break under Vitest.
- Dark mode follows the system only; there is no toggle yet.

### Consequences

- Good: accessible by construction; a contrast regression fails a test; one place for colour.
- Good: no package build, and the CSS holds only the utilities a page uses.
- Bad: Kobalte is 0.x software, and its TextField types omit `| undefined`, so `Field` takes its
  root props from Kobalte's own types to satisfy `exactOptionalPropertyTypes`.
- Bad: a palette utility fails silently (no CSS), not loudly.
- Bad: components (`.tsx`) are held by tests but not by the coverage threshold.
- Bad: a user cannot pick a theme against the system's.

## Revisit when

An app needs a user-chosen theme (add a `data-theme` switch), the design system is consumed from
outside this workspace (build and publish it), tokens must be shared with design tools (move to
JSON tokens and Style Dictionary), or Kobalte stops keeping up with Solid.
