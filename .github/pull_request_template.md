## What and why

<!-- What changes for the user or the code, and why now. Link the issue or plan item. -->

## How it was checked

- [ ] Green: `pnpm lint && pnpm typecheck && pnpm test:coverage && pnpm lint:deps && pnpm lint:fsd && pnpm knip && pnpm test:e2e` (100% coverage)
- [ ] A rule or a bug started with a failing test (`tdd-slice`)

## Screens (when one changed)

- [ ] Walked every screen touched at 375×812 and on desktop, light and dark, with seeded data (several roles, a long name, an empty list)
- [ ] `design-system`: one idea, one presentation; no layout shift
- [ ] `minimize-support` run on what the user sees or triggers

## Decisions and security

- [ ] A decision made here has its ADR in `docs/adr/` (`write-adr`), or none was made
- [ ] A change to a flow, a provider, an auth plugin or a trust boundary updates `docs/security/threat-model.md`, or none was made
- [ ] A removed feature leaves nothing behind: entity, provider, texts in every language, fixtures, unused `packages/ui` pieces
