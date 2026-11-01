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
  `outline` or `ghost`. A page of independent sections, such as the account page, is one view per
  section: each section's own form may have its primary.
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
  button below the field: the press itself moves focus, and errors coming or going above the button
  move it from under the pointer before the click lands, so the click is lost. A button beside the
  input (show password) does not move, so the check runs.
- **An error takes the hint's place.** A field shows its hint or its error, never both: they often
  say the same thing twice.
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
- **Which role** ([ADR 0026](../../../docs/adr/0026-add-surface-and-state-colour-roles.md)):
  - `background` is the page; `surface` is an area set apart from it (the side menu), never a
    button (that is `secondary`).
  - `border` outlines a control (input, outline button); `border-subtle` frames or divides an area
    (a section's group of rows, between rows, the side menu's edge). A field inside a group keeps
    `border`, so it still reads as a field.
  - `success` and `warning` are state text, always with a word ("On", "Service is slow"), never
    colour alone; a state that is neither (off, not set up) stays `muted-foreground`;
    `destructive` stays for errors and the actions that remove.
- **One choice of many.** Two to four short choices, all in view: `SegmentedControl` (the theme). A
  list that can grow or has long labels: `Select`, the browser's own (the language), so a phone
  opens its native picker.
- **Selected without a shadow.** A segmented control (or any selected item in a group) shows its
  selection with a `border` outline on `background`, not a shadow, in line with "no shadows".
- **Messages.** An outcome the user must notice is an `Alert`: `error` (announced at once), `warning`,
  `success` or `info` (polite), each with its own icon, a bar and an icon in the kind's colour on a
  `surface`. A small state beside a control (a row's "Your password was changed") stays a line of
  text with the kind's icon; a field error stays text under its field. Never colour alone.
- **Icons** ([ADR 0027](../../../docs/adr/0027-wrap-one-icon-set-in-the-design-system.md)): only
  through `<Icon name>` from `@repo/ui`, never an import of the set or an inline `<svg>`. Named for
  what it means (`security`, not `shield`). An icon beside text is decorative and says nothing; an
  icon alone (an icon-only button) takes a `label`. It follows the text's size (`em`); colour comes
  from the text role around it.

## States and interaction

- Hover only enhances: phones have none, so nothing depends on it.
- Focus is always visible (`focus-visible:outline-2 outline-offset-2 outline-ring`).
- Do not disable a submit button to signal invalid input: it cannot say why. Validate on submit and
  point to the field. Disable only while the request is pending, which also stops a double submit.
- Keep what the user typed after an error.

## Accessibility

- Every control has a visible label (a placeholder is not a label) and the right `type`,
  `autocomplete` and `inputmode`. The browser's suggestions are off (`autocomplete="off"`) on name,
  email and code fields; the sign-in's email (`username`) and the password fields (`current-password`,
  `new-password`) keep theirs, since password managers fill them by it.
- Touch targets are at least 44px tall on phones for the main controls (WCAG 2.2 asks 24px at least);
  inputs use 16px text on phones, or iOS zooms in on focus.
- On a route change, focus moves to the `h1`; after a failed submit, to the first invalid field, or
  to the form error.
- Errors are `role="alert"`; progress and success are `role="status"`.
- Landmarks: `header`, `main`; one `h1` per screen.
- Motion ([ADR 0031](../../../docs/adr/0031-animate-layers-with-short-transform-and-opacity-motion.md)):
  a layer that comes and goes (drawer, dialog, menu, popover) is animated; nothing else moves (a form that opens inside
  a page appears at once). Use the classes of the preset, never a duration of your own:
  `ds-scrim` (the veil), `ds-sheet` (a panel from the left), `ds-dialog`, and `ds-pop` (from its button),
  with the Kobalte layer's `data-expanded` and `data-closed`. Only `transform` and
  `opacity`, so nothing shifts; a layer centred with a `translate` utility must be centred another way
  (`inset-x-4 mx-auto`), or the animation undoes it. With `prefers-reduced-motion` they only fade.
  Colour transitions stay on controls.

## Copy

- Sentence case everywhere, buttons included.
- Buttons are verbs that say the outcome: "Create account", "Send link", not "Submit" or "OK".
- An error says what happened and what to do, without blaming: "This link has expired. Ask for a
  new one."
- The same word for the same thing on every screen and in every language:

  | | pt-BR | es |
  |---|---|---|
  | sign in | entrar (the noun is *login*, never "entrada") | iniciar sesión |
  | sign up | criar conta | crear cuenta |
  | sign out | sair | cerrar sesión |
  | email | e-mail | correo electrónico as the label, *correo* in a sentence |
  | turn on / off | ativar / desativar, never "ligar" | activar / desactivar |

  Address the user as *você* (pt-BR) and *tú* (es), and avoid words that mark the user's gender
  ("¿Eres nuevo?"). Write the plural when the text is about the codes ("Copiados").
- Short: one idea per sentence; no "Oops", no exclamation marks.

## Tests

- Query by role and accessible name (Testing Library), the way a screen reader finds things.
- Cover each state the component has, and the keyboard path for anything interactive.
- A new role pair joins `tokens.test.ts`; a colour written by hand fails `colours.test.ts`.
