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

1. **Reuse first.** Find the idea in "One idea, one presentation" below and use what it names. A
   new component or variant goes in `packages/ui`, used by every screen that needs it, with tests.
   Markup copied from another screen (a `panel.tsx`, a row of buttons, a label above a select) is
   the sign that a component is missing.
2. **Mobile first.** Build the 360px layout first, then the wider ones.
3. **No shift.** Check that no state change moves what the user is looking at or touching (below).
4. **States.** Cover hover, focus-visible, pressed, disabled, pending, invalid, empty and error.
5. **Accessible.** Role and name, keyboard path, focus, live regions, touch size (below).
6. **Copy.** Texts come from the i18n dictionaries, in both languages, following the copy rules.
7. **Look at it.** Open the screen in the browser at 375×812 and at desktop width, light and dark,
   before calling it done, with real data: several roles, a long name, an empty list, a slow load.
   Open two panels in a row and check that the second waits.

## Layout and positions

- **Families share a layout.** All entry screens (sign-up, sign-in, MFA, forgot and reset password)
  use one layout: brand at the top, then the `h1`, a one-line description, the form, the primary
  action as the form's last element, and secondary links in the same place below the form. App
  screens share the app shell: one `AppFrame` route (side menu, top bar, palette) drawn once and kept
  between screens, and each screen an `AppShell` (its title and `main`), which tells the frame its title
  and organization ([ADR 0037](../../../docs/adr/0037-keep-one-app-frame-across-screens.md)). Chrome
  belongs in the frame, never copied into a screen.
- **One column on phones.** Side by side only from `sm:` or wider, and only when the content needs it.
- **Widths:** entry screens `max-w-sm`; content screens `max-w-2xl`; always `w-full mx-auto` with
  `px-4` on phones and `sm:px-6` above.
- **Spacing:** `gap-1.5` inside a field, `gap-4` between fields, `gap-6` to `gap-8` between sections,
  `py-8` on phones to `sm:py-12` above. Use these, not new values.
- **Type:** one `h1` per screen (`text-2xl font-semibold tracking-tight`), body `text-base` on
  phones, labels `text-sm font-medium`, hints and secondary text `text-sm text-muted-foreground`.
- **Alignment:** text and forms are left-aligned; centred text only for a short standalone message
  (`EmptyState`).
- **Where buttons go.** Two kinds, two places:
  - A form's buttons (`FormActions`, `ConfirmForm`) start the line, aligned with its fields: the one
    that sends first, Cancel after it. The eye goes label, field, action down one column, and the
    order is the same when they stack full width on a phone.
  - A row's own action (the button that opens its panel, `PanelButton`) sits at the row's end: it
    belongs to the row, and the panel it opens holds the form, whose buttons start the line again.
  - Right-aligned button rows are for dialog footers; the template edits inline and has none. Never
    right-align a form's buttons to sit under the button that opened it.

## One idea, one presentation

The same idea looks and behaves the same everywhere. Before building, find it here:

| Idea | Use | Not |
| --- | --- | --- |
| A page of settings | `SettingsSection` of `SettingsRow`s | cards or lists of one's own |
| A row's form, opened inline | `PanelButton` + `SettingsPanel`, one `createPanels()` per screen | a signal per section, a `panel.tsx` per page |
| The buttons that end a form | `FormActions` | `div.flex` with `w-full sm:w-auto` on each button |
| Asking before removing (remove, leave, delete, revoke with consequences) | `ConfirmForm` in the row's panel, a field in it when the action cannot be undone | a dialog, a bespoke warning + buttons |
| A labelled select | `SelectField` | a `label` + `Select` + hint by hand |
| A group of controls with one label and one error | `Fieldset`; a resource's checkboxes in a `CheckboxGroup` | a `fieldset` whose `legend` sits on the border, a `p role=alert` by hand |
| A person, an organization, an invited address | `Avatar` (circle, square, `mail` icon) | `icon="profile"`, `letter="@"` |
| Who or what a menu is about (organization, account) | `menuTriggerClass` + `MenuTriggerContent` | trigger classes copied |
| Waiting for the server ([ADR 0035](../../../docs/adr/0035-show-the-server-working-with-one-progress-bar.md)) | nothing drawn yet: the family's skeleton (`SettingsSkeleton`, `EntrySkeleton`, `ShellSkeleton`); an action: its button's `pending`; the screen already drawn: the app's `ProgressBar`, which follows every request by itself; moving to another screen: the current one stays until the next is ready ([ADR 0036](../../../docs/adr/0036-keep-the-screen-until-the-next-one-is-ready.md)) | a spinner, an overlay, a "Loading…" text, a bar of one's own, a delay of one's own instead of `motion.waitDelay` |
| Nothing here yet | `EmptyState` | a blank page |
| A row that left a list (removed, deleted, revoked) | the section's `status`, which takes focus | a `p role=status` with negative margins |
| A date | `formatDate` from `#shared/lib` | `Intl.DateTimeFormat` with options of one's own |
| Answering an invitation | `/invitations/:id` only; other screens link to it | buttons to accept in a list |

When two screens need the same idea with a difference, the difference is a prop of the one
component, never a second component.

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
- **Empty slots draw nothing.** `SettingsRow` draws its action and panel areas only when they hold
  something, so `panel={<Show when={open}>…</Show>}` is safe. A component that takes a slot does the
  same (`children()` and check what it resolved to), never `<Show when={props.slot}>`, which is always
  truthy for JSX.
- **Lay out by the container, not the screen.** A component that may sit in a narrow column (an entry
  screen) and in a wide one (settings) switches with container queries (`@container`, `@md:`), as
  `SettingsRow` and `FormActions` do; `sm:` only for the page's own frame.
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
- **Icons** ([ADR 0027](../../../docs/adr/0027-wrap-one-icon-set-in-the-design-system.md),
  [ADR 0032](../../../docs/adr/0032-draw-icons-from-phosphor-generated-from-its-svgs.md)): only
  through `<Icon name>` from `@repo/ui`, never an import of the set or an inline `<svg>`. Named for
  what it means (`security`, not `shield`). An icon beside text is decorative and says nothing; an
  icon alone (an icon-only button) takes a `label`. It follows the text's size (`em`); colour comes
  from the text role around it. Icons are `regular`; the ones that mark a state come in `duotone` too
  (`weight="duotone"`, typed per name). A new icon or weight is a line in
  `packages/ui/scripts/generate-icons.mjs`, then `pnpm --filter @repo/ui icons`.

## States and interaction

- Hover only enhances: phones have none, so nothing depends on it.
- Focus is always visible (`focus-visible:outline-2 outline-offset-2 outline-ring`).
- Do not disable a submit button to signal invalid input: it cannot say why. Validate on submit and
  point to the field. Disable only while the request is pending, which also stops a double submit.
- Keep what the user typed after an error.
- **One panel open at a time, across the whole screen.** While one is open every other opener, and
  every action that changes the same data (resend, revoke), waits disabled. Closing gives focus back
  to the button that opened it; a row that left the list says so in its section's `status`.
- **An action that cannot be taken here.** If the user may take it in general, it shows on every row
  and is disabled where it cannot be taken, with the reason in the row's `note` (an owner above
  you, the only owner leaving). If the user may never take it, it does not show, and the section's
  description says the page is read only.
- **Read only is not disabled.** A value shown but not editable (a built-in role's permissions, a role
  name members hold) uses `readOnly`: quiet, on the surface, still readable. `disabled` is for a
  control that could act but cannot now, faded, with the reason beside it.
- **Every button that opens a panel is `secondary`,** the destructive ones included; `destructive`
  colours only the button that confirms, inside `ConfirmForm`.

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
  Colour transitions stay on controls. The one motion that is not a layer is the progress bar's
  (`ds-progress`, [ADR 0035](../../../docs/adr/0035-show-the-server-working-with-one-progress-bar.md)),
  which stands still and pulses with reduced motion.

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

  | join (an organization) | participar, aceitar convite, never "entrar em" | unirte |
  | leave (an organization) | sair da organização, never "sair" alone | salir de la organización |

  Address the user as *você* (pt-BR) and *tú* (es), and avoid words that mark the user's gender
  ("¿Eres nuevo?", "Você foi convidado", "É o único proprietário"): rephrase around the thing
  ("Há convites para você", "Ninguém mais é proprietário"). Write the plural when the text is about
  the codes ("Copiados").
- **One key for one text.** A word every screen says (Cancel, Try again) lives once, in `actions`;
  a screen does not get its own copy of it.
- **A row titled like its button says the action** ("Criar papel" / "Criar papel", "Convidar
  pessoas" / "Convidar pessoas"), the description saying what follows.
- **Names users give** are shown as the built-in ones are, with a capital (a custom role "editor"
  reads "Editor" beside "Membro"); the stored name stays as typed in the field that edits it.
- Short: one idea per sentence; no "Oops", no exclamation marks.

## Tests

- Query by role and accessible name (Testing Library), the way a screen reader finds things.
- Cover each state the component has, and the keyboard path for anything interactive.
- A new role pair joins `tokens.test.ts`; a colour written by hand fails `colours.test.ts`.
