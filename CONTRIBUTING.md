# Contributing

## Setup

```bash
nvm use        # Node 24 (.nvmrc / .node-version)
pnpm install   # also installs the Git hooks
```

## Everyday commands

```bash
pnpm lint        # Biome
pnpm format      # Biome, write
pnpm typecheck
pnpm test
```

## Workflow

- Work on a branch; open a pull request to `main`.
- Commits follow [Conventional Commits](https://www.conventionalcommits.org/) (`feat:`, `fix:`,
  `docs:`, `chore:`, `refactor:`, `test:`), checked by commitlint.
- A rule or a bug fix starts with a failing test.
- A technology or boundary decision gets an ADR in [`docs/adr/`](docs/adr/README.md).
- The build order is in [`docs/plan.md`](docs/plan.md).
