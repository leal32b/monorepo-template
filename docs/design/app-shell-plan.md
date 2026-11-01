# App shell and settings: implementation plan

Turns the shell prototype into the template's real UI. It is a phase of its own (suggested **6.2**,
before organizations in 6.5), built the usual way: teaching mode, TDD (`tdd-slice`), one decision per
ADR (`write-adr`), every screen through `design-system` and `minimize-support`, one commit per step.

- Prototype (interactive): https://claude.ai/artifact/6j3SMEBYfw4gh5p4ZDBpyR (private to the owner;
  an agent reads it with the Artifact tool's `read` action).
- Prototype source, kept here: [`shell-prototype/`](shell-prototype/). `Main.dc.html` is the app,
  `Entry.dc.html` the entry screens; the `*Mobile` files render the same at 390px. They are a design
  reference, not code to copy: the real screens compose `@repo/ui`, with role colours and i18n.

## What the prototype decided

- **Side menu:** brand or organization at the top; the product's own screens (Home now, the
  reference module in Phase 7); a footer with the account menu (Settings, Help, Sign out) and a
  service status icon. All is well: the icon alone. A problem: a line of text above the account.
- **Top bar, sticky:** breadcrumb (`App › Settings › Security`, parents are links) and the search
  button (⌘K). On phones: ☰, the screen's title and search; no breadcrumb.
- **Settings is a mode:** the side menu swaps to `← Back to app` + "Your account" (Profile, Security,
  Preferences) and later "Organization" (General, Members, from 6.5). Members never sit in the main menu.
- **Sections:** a page is sections; a section is a heading, one line, and a bordered group of rows.
  A row is icon, title + state badge, description, action on the right. A row's form opens inline
  below it (one panel at a time), never on another page.
- **Phones:** the side menu is a drawer; rows stack, actions full width, 44px targets.

## Steps

Each step ends green with `pnpm lint && pnpm typecheck && pnpm test:coverage && pnpm lint:deps && pnpm lint:fsd`
and a look in the browser at 375×812 and desktop, light and dark.

### 1. Colour roles and the rules they change · 🟥 Opus
- ADR: new roles `surface` (slate-50 / slate-900), `border-subtle` (slate-200 / slate-800),
  `success` (green-700 / green-400), `warning` (amber-700 / amber-400). `border` stays for inputs.
- `tokens.ts` primitives and themes; `tokens.test.ts` holds `success` and `warning` text at 4.5:1 on
  `background` and `surface`.
- `design-system` skill: when `surface` and `border-subtle` are used; a segmented control shows its
  selected item with a border, not a shadow.

### 2. Icons · 🟦
- ADR: one icon set for the template (for example `lucide-solid`, tree-shaken), wrapped in `@repo/ui`
  as `Icon` so apps never import the set. Decorative by default (`aria-hidden`); icon-only buttons
  take a label.

### 3. Design system components · 🟦
In `packages/ui`, each with tests for its states and keyboard path:
- `Badge`: neutral, success, warning, destructive, with an optional dot.
- `SettingsSection` (title, description, children) and `SettingsRow` (icon, title, badge,
  description, action, and an inline panel slot).
- `SegmentedControl` (Kobalte ToggleGroup or SegmentedControl).
- `Menu` (Kobalte DropdownMenu) and `Popover` (Kobalte Popover).
- `Sheet` (Kobalte Dialog as a side drawer) for the phone menu.
- `Stepper` (steps with current and done states).
- `Alert` gains an optional reference line (`requestId`), the standard error component that
  `minimize-support` lists as missing.

### 4. App shell · 🟦
`widgets/app-shell` rebuilt from those components: `Sidebar`, `TopBar`, `UserMenu`, `ServiceStatus`
(reads `entities/health`; replaces the status section on Home). The shell keeps one `h1` per screen
and moves focus to it on route change. Mobile drawer from `Sheet`.
- minimize-support: status problem shown as text (detect early); request id in the details.

### 5. Settings routes · 🟥 Opus (session and redirects)
- `/settings/profile`, `/settings/security`, `/settings/preferences`; `/settings` goes to profile.
- `/account` redirects to `/settings/security`, keeping `?error=` (the Google link flow comes back
  there) and every `next=%2Faccount` already in emails or bookmarks.
- Settings mode in the side menu; breadcrumb from the route.

### 6. Security page in sections and rows · 🟦
Same features as today, new structure: "Ways to sign in" (Password, Google) and "Two-step
verification" (Authenticator app, Backup codes).
- Turning on: a `Stepper` (confirm it is you, connect the app, save the codes); the last step has no
  cancel. Turning off and new codes: say what is lost, then the password.
- Unlink Google: no confirmation (it can be linked again); the row says how to undo. A Google-only
  account sees no unlink action.
- Success shows in the row (`role="status"`); errors in the field or the panel.

### 7. Preferences · 🟥 Opus (theme ADR)
- Theme: System, Light, Dark. ADR: the choice is kept on the device (`localStorage`, read before
  render so there is no flash) and applied as `data-theme` on `html`; the preset emits the dark
  variables for `[data-theme=dark]` and for the system preference when no choice is stored.
- Language: the three locales with `setLocale`, kept on the device the same way.
- Profile: name and email as today (no edit unless the plan adds it).

### 8. Command palette · 🟦
⌘K or the search button: go to screens and run a few actions (theme, sign out). Kobalte Dialog with
a filtered list; the shortcut listener lives in `app/`.

### 9. Entry screens · 🟦
On `EntryLayout`, after `minimize-support`:
- "Continue with Google" first, then "or", then the form; the primary action stays last.
- "Forgot your password?" beside the password label.
- Resend with a 30 s cooldown shown on the button (`shared/lib`, tested): stops double sends and 429s.
- "Open Gmail" or "Open Outlook" from the email's domain on "Check your email" and after the reset
  request (`shared/lib`, tested; nothing for other domains).
- A known outage said before the user tries (reads `entities/health`).
- Language picker in the footer.

### 10. Home · 🟦
Getting started: email confirmed, two-step verification (links to Security). Invite people joins
in 6.5.

## Left out on purpose
- Trust this device (MFA): changes authentication, needs the threat model and an ADR.
- "8 of 10 backup codes left": only if Better Auth exposes the count.
- Sessions list and activity log: not in the plan's phases yet.
- Organization switcher, Members, invitations: Phase 6.5 builds them into this shell.
