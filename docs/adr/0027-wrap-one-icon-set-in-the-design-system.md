# 0027. Wrap one icon set in the design system

- Status: accepted
- Date: 2026-11-01

## Context and problem statement

The app shell ([plan](../design/app-shell-plan.md)) needs icons: the side menu, settings rows, the
top bar, the status of the service. The prototype draws each one as inline SVG, which cannot be kept
coherent as screens multiply (stroke, size and corner differ per hand) and which a screen would have
to repeat. [ADR 0017](0017-build-the-web-ui-from-the-design-system-first.md) says screens compose
`@repo/ui` and import no library of their own, as [ADR 0016](0016-design-system-on-kobalte-and-unocss.md)
does for Kobalte.

Which icon set does the template use, and how does an app reach it?

## Decision drivers

- One look: the same stroke, grid and weight on every screen.
- Small bundles: an app ships the icons it uses, not the set ([ADR 0012](0012-bundle-the-api-with-esbuild.md)
  and phase 6.1 care about weight).
- Accessible by default (WCAG 2.2 1.1.1): decorative unless it carries meaning.
- Swappable: changing the set touches one folder, not every screen.

## Considered options

1. Inline SVG per screen, as in the prototype.
2. `lucide-solid`, imported by the apps wherever an icon is needed.
3. `lucide-solid`, wrapped in `@repo/ui` as `Icon`, with a fixed list of names.
4. An icon font or an SVG sprite.

## Decision outcome

Chosen option 3.

- `lucide-solid` is a dependency of `@repo/ui` only. Each icon is imported from its own file
  (`lucide-solid/icons/house`), so a bundle carries only the icons listed.
- `<Icon name="security" />` takes a name from a typed list in `packages/ui/src/icon/icons.ts`.
  Names say what the icon **means** (`security`, `sign-out`, `back`), not what it draws, so a
  different set or a different drawing changes one line.
- An icon is decorative by default: `aria-hidden="true"`. It is the image of its `label` when given
  one (`role="img"`), which an icon-only button needs. Text inside `packages/ui` stays a prop.
- It is sized in `em`, so it follows the text around it, and takes its colour from the text role
  (`currentColor`). A passed `class` places it and does not resize it ([ADR 0025](0025-add-a-passed-class-instead-of-merging-it.md)).
- A new icon is a line in `icons.ts`. Apps and screens never import `lucide-solid` and never write
  an inline `<svg>`.

Option 1 was rejected for the drift above. Option 2 was rejected because every screen would then
choose icons by drawing and import the set, and swapping it would touch them all. Option 4 was
rejected because a font cannot be tree-shaken and a sprite ships every icon.

### Consequences

- Good: one icon look, checked in one place; apps cannot drift or ship the whole set.
- Good: swapping the set is a change to `icons.ts`.
- Bad: a new icon takes a line in `@repo/ui` before a screen can use it.
- Bad: the template depends on `lucide-solid`, a community package for Solid rather than the
  official Lucide one; it is small and only wrapped here, which limits the cost of leaving it.

## Revisit when

The set lacks a drawing the product needs often (brand logos, for example, which Lucide leaves
out), or `lucide-solid` falls behind Solid or Lucide.
