# 0025. Add a passed class instead of merging it

- Status: accepted
- Date: 2026-10-31

## Context and problem statement

[ADR 0016](0016-design-system-on-kobalte-and-unocss.md) made `cn` (clsx + tailwind-merge) join a
component's classes with the `class` a screen passes, so the passed one overrides the component's
own (`cn('px-4', 'px-6')` gives `px-6`). tailwind-merge ships the rules of every Tailwind utility
and was 27 kB of the 210 kB web bundle (13%), for a design system whose colours are roles and
whose screens, [by ADR 0017](0017-build-the-web-ui-from-the-design-system-first.md), compose
`@repo/ui` instead of restyling it. No screen passes a `class` to a component today.

What does a passed `class` do, and is it worth 27 kB?

## Decision drivers

- A smaller initial bundle, mobile first.
- A screen should not restyle a component: a look that differs belongs in the design system.
- A merge that handles only some utilities would fail silently on the rest, in a template.
- UnoCSS orders conflicting utilities by its stylesheet, not by their order in `class`, so
  without a merge a conflict is not won by "the later one".

## Considered options

1. Keep tailwind-merge.
2. A small merge of our own, covering the utilities the components use.
3. Plain clsx: a passed `class` is added to the component's own.

## Decision outcome

Chosen option 3. `cn` is `clsx`. A passed `class` places a component (`mt-4`, `mx-auto`, `w-full`
where the component has no width); it never restyles one. Needing to override a utility means
the component lacks a variant, and the variant is added in `@repo/ui` with its tests.

The one override inside the design system, the password toggle, became what it was missing: a
`bare` variant and an `icon` size for `Button`, and an input class with room for an action.

Option 2 was rejected: a table of conflicting groups is tailwind-merge in small, and every
utility it misses breaks without a sound.

### Consequences

- Good: 27 kB less in the web bundle.
- Good: one fewer dependency, and a component's look can no longer drift per screen.
- Bad: a conflicting `class` (`px-6` on a button that has `px-3`) is not an override: both stay,
  and the stylesheet decides. The component tests state that the class is added.

## Revisit when

A screen needs to restyle a component and a variant does not fit, or a component takes a class
that conflicts with its own often enough to hurt.
