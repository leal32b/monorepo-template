# Testing

Each layer tests what only it can show; a rule is proved once, at the lowest layer that can show it.

| Layer | What it proves | Where | Command |
| --- | --- | --- | --- |
| Unit | Domain rules, use cases, components, helpers | `*.test.ts(x)` next to the code | `pnpm test` |
| Database | Repositories, migrations, Better Auth on real Postgres (PGlite in process): the 429, a breached password, the last owner | `*.db.test.ts` | `pnpm test` |
| HTTP | Each route through the real pipeline: status, problem format, permissions | `*.db.test.ts` in `apps/api/src/app` | `pnpm test` |
| End to end | The layers fit: journeys in the browser, axe on every screen, the JavaScript budget | `apps/e2e/tests` | `pnpm test:e2e` |

Coverage is 100% for every package (`pnpm test:coverage`); `index.ts`, ports and the two entries
(`main.ts`, `main.e2e.ts`) are excluded.

## End to end

`pnpm test:e2e` starts everything itself ([ADR 0045](adr/0045-run-the-end-to-end-suite-on-the-built-app-without-outside-services.md)):
an in-memory PGlite on 5435, the API's end-to-end entry on 3005 (one database connection, which PGlite needs: [ADR 0055](adr/0055-keep-tenants-apart-with-row-level-security-set-by-the-unit-of-work.md); emails to a file, breached-password
check offline), and the production build of the web app through `vite preview` on 4173, with the
production CSP. It never touches `apps/api/.data` or the dev servers, and needs no internet.

The first time, install the browser: `pnpm --filter @repo/e2e exec playwright install chromium`.

| Spec | What it shows |
| --- | --- |
| `owner.setup.ts` | Signs up an owner with an organization and saves the session for the specs that start inside the app |
| `first-customer.spec.ts` | Sign-up, confirmation from the email, onboarding, the first customer |
| `invitation.spec.ts` | An invitation by email, sign-up from it, the member's read-only view |
| `password-reset.spec.ts` | A reset from the email, then a sign-in with the new password |
| `two-factor.spec.ts` | Two-step verification turned on, then a sign-in with a code |
| `accessibility.spec.ts` | No serious or critical axe violation on every screen, panel and the palette, light and dark; the phone menu's focus |
| `bundle-budget.spec.ts` | The gzipped JavaScript of a cold load: 78 KB before sign-in, 117 KB before the first signed-in screen |
| `security-headers.spec.ts` | The page carries HSTS, the permissions policy and COOP from `public/_headers` |

Rules for a new test:

- A journey crosses layers; an edge case belongs to a lower layer.
- Each test uses fresh accounts (`uniqueEmail`) or the setup's owner, and its own organization when it
  changes data. A second person comes from `newPerson`, with an empty session.
- Find things the way people do: `getByRole`, `getByLabel`, the English texts of the dictionary.
- No retry: a flaky test is a bug. A failure in CI leaves the report and the trace as an artifact;
  open a trace with `pnpm --filter @repo/e2e exec playwright show-trace <trace.zip>`.

## Static gates

`pnpm lint`, `pnpm typecheck`, `pnpm lint:deps` (import graph), `pnpm lint:fsd` (Feature-Sliced
Design) and `pnpm knip` (dead files, exports and dependencies). An export kept for code that does not
exist yet is marked `/** @public */`, as the identity module's API is.
