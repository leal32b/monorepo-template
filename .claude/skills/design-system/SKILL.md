---
name: design-system
description: >-
  How components and screens are designed and built in this template: simple, elegant and coherent,
  mobile first, accessible, with no layout shift between states or screens. Use whenever a change
  creates or alters a component in packages/ui or a screen, layout or copy in apps/web.
---

# Design system

The look and the tools are decided in [ADR 0016](../../../docs/adr/0016-design-system-on-kobalte-and-unocss.md)
(Kobalte behaviour, UnoCSS look, colours as roles held to WCAG) and
[ADR 0017](../../../docs/adr/0017-build-the-web-ui-from-the-design-system-first.md) (screens compose
`@repo/ui`; a missing component is added there, with tests). This skill is how to use them well.
What a screen must handle when things go wrong comes from the `minimize-support` skill.

## The vision

**Simple and elegant.** Every screen looks like part of one product.

- Restraint: one typeface (the system stack), few text sizes, one radius (`rounded-md`), one
  border width, no shadows or gradients unless the design system adds them for everyone.
- One accent: `primary` marks the single action a view is about. Everything else is `secondary`,
  `outline` or `ghost`.
- Whitespace on one scale (multiples of 4px), never a value picked for one screen.
- Before adding something, ask whether removing something would solve it instead.

**Coherent.** Screens of the same kind share one layout component, so their common elements sit in
the same place, at the same size, in the same order. Moving between them, nothing jumps: the brand,
the title, the form column and the secondary links stay where they were.

**Mobile first.** Design for a 360px-wide screen, then add `sm:`/`md:` for larger ones. Base classes
are the phone; breakpoints only add.

## Checklist

1. **Reuse first.** Compose existing components and the family's layout. A new component or
   variant goes in `packages/ui`, used by every screen that needs it, with tests.
2. **Mobile first.** Build the 360px layout first, then the wider ones.
3. **No shift.** Check that no state change moves what the user is looking at or touching (below).
4. **States.** Cover hover, focus-visible, pressed, disabled, pending, invalid, empty and error.
5. **Accessible.** Role and name, keyboard path, focus, live regions, touch size (below).
6. **Copy.** Texts come from the i18n dictionaries, in both languages, following the copy rules.
7. **Look at it.** Open the screen in the browser at 375×812 and at desktop width, light and dark,
   before calling it done.

## Layout and positions

- **Families share a layout.** All entry screens (sign-up, sign-in, MFA, forgot and reset password)
  use one layout: brand at the top, then the `h1`, a one-line description, the form, the primary
  action as the form's last element, and secondary links in the same place below the form. App
  screens share the app shell (header with the brand and the account menu, then `main`).
- **One column on phones.** Side by side only from `sm:` or wider, and only when the content needs it.
- **Widths:** entry screens `max-w-sm`; content screens `max-w-2xl`; always `w-full mx-auto` with
  `px-4` on phones and `sm:px-6` above.
- **Spacing:** `gap-1.5` inside a field, `gap-4` between fields, `gap-6` to `gap-8` between sections,
  `py-8` on phones to `sm:py-12` above. Use these, not new values.
- **Type:** one `h1` per screen (`text-2xl font-semibold tracking-tight`), body `text-base` on
  phones, labels `text-sm font-medium`, hints and secondary text `text-sm text-muted-foreground`.
- **Alignment:** text and forms are left-aligned; centred text only for a short standalone message.

## No layout shift

Elements must not "tremble" between states or screens.

- **Do not move what was just touched.** Feedback after an action (a form error, "link sent")
  appears below the action or in space reserved for it, never above it pushing it down.
- **Same size in every state.** A pending button keeps its width (full width on phones, or a fixed
  minimum); a loading area shows a placeholder of the content's size.
- **Field errors on submit.** Validate on submit (and on blur once a field was submitted), not on
  every keystroke, so the form does not jump while typing. Skip the blur check when focus moves to a
  button: the press itself moves focus, and errors coming or going above the button move it from
  under the pointer before the click lands, so the click is lost.
- **Stable frame.** The layout keeps its scrollbar gutter (`scrollbar-gutter: stable` on `html`), so a
  page that scrolls and one that does not line up; fonts are the system stack, with no swap.

## Components

- **API:** `label`, `description` and `error` for fields; `variant` and `size` with the same names
  across components; a passed `class` goes on the outermost element; other props reach the native
  element. No text inside `packages/ui`: every string arrives as a prop.
- **Variant or component?** Same behaviour, different look: a variant. Different behaviour or
  structure: a component.
- **Behaviour from Kobalte** for anything interactive; the look in a `cva` file (`.ts`, so coverage
  counts it); colours only as roles, and a new role pair joins the contrast test.

## States and interaction

- Hover only enhances: phones have none, so nothing depends on it.
- Focus is always visible (`focus-visible:outline-2 outline-offset-2 outline-ring`).
- Do not disable a submit button to signal invalid input: it cannot say why. Validate on submit and
  point to the field. Disable only while the request is pending, which also stops a double submit.
- Keep what the user typed after an error.

## Accessibility

- Every control has a visible label (a placeholder is not a label) and the right `type`,
  `autocomplete` (`email`, `name`, `current-password`, `new-password`, `one-time-code`) and
  `inputmode`.
- Touch targets are at least 44px tall on phones for the main controls (WCAG 2.2 asks 24px at least);
  inputs use 16px text on phones, or iOS zooms in on focus.
- On a route change, focus moves to the `h1`; after a failed submit, to the first invalid field, or
  to the form error.
- Errors are `role="alert"`; progress and success are `role="status"`.
- Landmarks: `header`, `main`; one `h1` per screen.
- Respect `prefers-reduced-motion`; colour transitions are the only animation by default.

## Copy

- Sentence case everywhere, buttons included.
- Buttons are verbs that say the outcome: "Create account", "Send link", not "Submit" or "OK".
- An error says what happened and what to do, without blaming: "This link has expired. Ask for a
  new one."
- The same word for the same thing on every screen and in both languages (sign in → entrar, sign up
  → criar conta, sign out → sair, email → e-mail).
- Short: one idea per sentence; no "Oops", no exclamation marks.

## Tests

- Query by role and accessible name (Testing Library), the way a screen reader finds things.
- Cover each state the component has, and the keyboard path for anything interactive.
- A new role pair joins `tokens.test.ts`; a colour written by hand fails `colours.test.ts`.
