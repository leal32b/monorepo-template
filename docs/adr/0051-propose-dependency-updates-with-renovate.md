# 0051. Propose dependency updates with Renovate

- Status: accepted
- Date: 2026-11-08

## Context and problem statement

Updates depended on someone running `pnpm outdated -r`. On the day of the 2026-11-08 audit Better Auth
was four patches behind, and the weekly `pnpm audit` only catches published advisories. GitHub Actions
are pinned by SHA and the Docker base image is pinned by digest, so nothing moves them unless someone
does. The guide had left "Renovate: when the manual dependency checks slip" as a trigger; it slipped.

Which tool proposes the updates, and how are they grouped so that reviewing them stays cheap?

## Decision drivers

- Understands the pnpm catalog of `pnpm-workspace.yaml` (every version lives there) and the
  `packageManager` pnpm version.
- Waits a minimum release age, as pnpm itself does, so a compromised release has time to be pulled.
- Groups: dev tooling in one weekly pull request, runtime patches together, Better Auth on its own.
- Keeps Action SHAs and the image digest current, with the readable tag beside them.
- No workflow or token of ours to maintain.

## Considered options

1. Renovate, through the Mend Renovate GitHub App, configured in `.github/renovate.json`.
2. Dependabot (`.github/dependabot.yml`), built into GitHub.
3. Keep the manual check, with a reminder.

## Decision outcome

Chosen option: 1. Renovate reads the pnpm catalog and the `packageManager` field, groups by package
names (catalog entries carry no dev or runtime type, so names are the only way to split them),
has `minimumReleaseAge`, and updates SHA- and digest-pinned references while keeping their tag comment.
Dependabot's grouping and cooldown cover less, and its support for a new pnpm major lags. A reminder is
what already failed.

The rules (`.github/renovate.json`):

| What | When | Pull request |
| --- | --- | --- |
| Better Auth | any day | its own, first in the queue |
| Runtime patches (what the API and web ship) | Monday | one for all |
| A runtime minor or any major | Monday | one each |
| Dev tooling minor and patch | Monday | one for all |
| Action SHAs and the Docker digest | Monday | one for both |
| Lockfile maintenance | Monday | one |
| A Node major, `engines` | never | by hand: `.node-version`, the image and `@types/node` move together |

Every release waits 3 days. Commits are `chore(deps): …`, which commitlint accepts.

### Consequences

- Good: updates arrive without anyone remembering, each with CI's checks and the release notes.
- Good: the reading order is set by the grouping: Better Auth, then what users run, then tooling.
- Bad: a third-party app gets write access to pull requests in the repository; a product that does not
  accept it switches to Dependabot with the same groups.
- Bad: the runtime list in `.github/renovate.json` must follow the `dependencies` of the packages; a new
  runtime dependency left out lands in the dev tooling group.
- Bad: the config was not checked by `renovate-config-validator` locally; the app reports a broken
  config in its dependency dashboard issue on the first run.

## Revisit when

The weekly pull requests stay open for more than two weeks (the grouping is too coarse or too fine),
or Renovate stops reading the pnpm catalog or the `packageManager` version.
