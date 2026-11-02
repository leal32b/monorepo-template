# 0032. Draw icons from Phosphor, generated from its SVGs

- Status: accepted
- Date: 2026-11-02
- Supersedes the choice of set in [0027](0027-wrap-one-icon-set-in-the-design-system.md); its wrapper stays.

## Context and problem statement

[ADR 0027](0027-wrap-one-icon-set-in-the-design-system.md) wrapped `lucide-solid` in `Icon`, so apps ask
for icons by name and never import the set. Lucide is the set most templates start from, so the
interface looked like them, and it has one weight, so a state (the current screen) could only be told
by colour.

Which set does the template draw its icons from, and how does it reach the bundle?

## Decision drivers

- A look of its own, with rounded forms that suit the rest of the interface.
- More than one weight, so a state can be told by the icon as well as by colour.
- A dependency that is maintained: Phosphor has no official Solid package, and the one from a third
  party pins `solid-js` to an exact version.
- A small bundle: only the icons and weights drawn.
- The wrapper of ADR 0027 keeps the swap to one place.

## Considered options

1. Keep Lucide.
2. A third party's Phosphor package for Solid (`phosphor-icons-solid`).
3. Phosphor's official SVGs (`@phosphor-icons/core`), turned by a script into the markup `Icon` draws.

## Decision outcome

Chosen option 3. `@phosphor-icons/core`, a development dependency of `@repo/ui`, is read by
`packages/ui/scripts/generate-icons.mjs`, which writes `src/icon/phosphor-markup.ts`: only the icons
the template names, as the markup inside each `<svg>` on Phosphor's 256 grid, filled with the text
colour. Nothing of Phosphor ships but that file.

- **Weights are configured in the script.** Every icon comes in `regular`, the default. Another weight
  comes only for the icons listed for it: `duotone` for the side menu's, which mark the current
  screen. A weight nobody draws is not generated.
- **The types check the choice.** `Icon` takes `weight="duotone"` only for a name that has it
  (`DuotoneName`); `hasDuotone(name)` says which, for code that chooses at run time.
- **Names and a11y stay as in ADR 0027:** icons are named by what they mean, are decorative unless
  given a `label`, follow the text's size and take its colour. Brand marks keep their own colours
  ([ADR 0029](0029-draw-brand-marks-in-their-own-colours.md)).
- A new icon is a line in the script, then `pnpm --filter @repo/ui icons`.

Option 1 was rejected for the sameness and the single weight. Option 2 was rejected because it
depends on one maintainer and pins `solid-js` to an exact version.

### Consequences

- Good: a look of its own, and the weight tells the current screen without colour.
- Good: no third-party Solid package; the first download is about 0.5 kB gzip above Lucide's.
- Bad: a generated file in the repository, to refresh whenever the list changes.
- Bad: Phosphor's `regular` stroke is lighter than Lucide's 2 px, which shows at small sizes; the
  default weight is one line in `icon.tsx` if a heavier one is wanted.

## Revisit when

The icons look too light on a phone, or Phosphor publishes an official Solid package that is worth
the dependency.
