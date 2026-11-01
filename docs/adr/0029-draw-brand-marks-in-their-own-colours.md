# 0029. Draw brand marks in their own colours

- Status: accepted
- Date: 2026-11-01

## Context and problem statement

[ADR 0027](0027-wrap-one-icon-set-in-the-design-system.md) wraps one icon set, and said to revisit it
when the product needs a drawing the set lacks, brand logos first. The sign-in and sign-up screens
have "Continue with Google", and Google's guidelines ask for its "G" in its four colours. Lucide has no
brand marks. Colours elsewhere are roles only ([ADR 0016](0016-design-system-on-kobalte-and-unocss.md)),
and no literal colour is allowed in `apps/web`.

How does the template draw a brand mark, and where does its colour live?

## Decision drivers

- A brand mark must look as its owner asks, in light and in dark.
- The rule "colours are roles" must stay true for everything else.
- Apps keep importing no icon and no SVG ([ADR 0027](0027-wrap-one-icon-set-in-the-design-system.md)).

## Considered options

1. A letter "G" in the button, as the settings rows do.
2. The mark as a component in `@repo/ui`, in its brand colours, listed in `icons.ts` like any icon.
3. The mark as a role-coloured silhouette (`currentColor`).
4. An image file served by the app.

## Decision outcome

Chosen option 2. A brand mark is a small component in `packages/ui/src/icon/brand-icons.tsx` with the
colours its owner publishes, and a line in `icons.ts` (`google`). Apps ask for it as for any icon:
`<Icon name="google" />`. These files are the only place in the design system with literal colours;
`apps/web` still has none. A new mark is added only for a provider the product signs in with.

Option 1 was rejected as it is not the mark people look for. Option 3 was rejected because Google's
guidelines do not allow a one-colour "G" on a light button. Option 4 was rejected for a request, a
possible layout shift and a file apart from the icon set.

### Consequences

- Good: the button looks like the sign-in people know, and apps stay free of SVG and colours.
- Bad: the mark is a fixed drawing; if the owner changes its brand, one file changes.
- Bad: its colours do not follow the theme (the "G" is made for white and dark grounds alike).

## Revisit when

A second provider needs a mark, or a provider asks for a variant per theme.
