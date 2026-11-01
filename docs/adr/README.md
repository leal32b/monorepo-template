# Architecture decision records

One decision per file, numbered, written with [`template.md`](template.md) (MADR, short form).
A decision is never edited once accepted: supersede it with a new record.

| # | Title | Status |
| --- | --- | --- |
| [0001](0001-record-architecture-decisions.md) | Record architecture decisions as MADR files | accepted |
| [0002](0002-pnpm-workspaces-without-a-task-runner.md) | pnpm workspaces without a task runner | accepted |
| [0003](0003-postgres-as-the-database.md) | Postgres as the database | accepted |
| [0004](0004-tooling-biome-vitest-and-git-hooks.md) | Tooling: TypeScript, Biome, Vitest and Git hooks | accepted |
| [0005](0005-contracts-as-zod-schemas.md) | Contracts as Zod schemas in a shared package | accepted; schema API refined by [0024](0024-write-schemas-with-zod-mini.md) |
| [0006](0006-api-architecture.md) | API architecture: use-case slices, ports and a composition root | accepted |
| [0007](0007-http-pipeline-on-node-http.md) | HTTP pipeline on plain `node:http` | accepted |
| [0008](0008-architecture-boundaries-with-dependency-cruiser.md) | Architecture boundaries enforced by dependency-cruiser | accepted |
| [0009](0009-subpath-imports-for-aliases.md) | Subpath imports (`#...`) for path aliases | accepted |
| [0010](0010-web-architecture-feature-sliced-design.md) | Structure the web app with Feature-Sliced Design, checked by Steiger | accepted |
| [0011](0011-typed-i18n-dictionaries.md) | Typed i18n dictionaries with @solid-primitives/i18n | accepted |
| [0012](0012-bundle-the-api-with-esbuild.md) | Bundle the API with esbuild for production | accepted |
| [0013](0013-kysely-and-plain-sql-migrations.md) | Access Postgres with Kysely and migrate with plain SQL files | accepted; lock superseded by [0018](0018-take-the-migration-lock-inside-each-transaction.md) |
| [0014](0014-hosting-and-deploy-from-github-actions.md) | Host on Neon, Render and Cloudflare, deployed from GitHub Actions | accepted; web Worker extended by [0019](0019-reach-the-api-through-the-web-worker.md) |
| [0015](0015-cross-origin-access-with-a-cors-allowlist.md) | Serve the web origin with a CORS allowlist, `OPTIONS` and `HEAD` | accepted; production path superseded by [0019](0019-reach-the-api-through-the-web-worker.md) |
| [0016](0016-design-system-on-kobalte-and-unocss.md) | Build the design system on Kobalte and UnoCSS, consumed from source | accepted; passed class superseded by [0025](0025-add-a-passed-class-instead-of-merging-it.md), dark mode by [0028](0028-keep-theme-and-language-on-the-device.md) |
| [0017](0017-build-the-web-ui-from-the-design-system-first.md) | Build the web UI from the design system first | accepted |
| [0018](0018-take-the-migration-lock-inside-each-transaction.md) | Take the migration lock inside each migration's transaction | accepted |
| [0019](0019-reach-the-api-through-the-web-worker.md) | Reach the API through the web Worker, on the web origin | accepted; cookie prefix superseded by [0020](0020-authenticate-with-better-auth.md), client IP header by [0022](0022-accept-api-requests-only-from-the-web-worker.md) |
| [0020](0020-authenticate-with-better-auth.md) | Authenticate with Better Auth, behind our own ports | accepted |
| [0021](0021-send-email-through-a-provider-neutral-port.md) | Send email through a provider-neutral port | accepted |
| [0022](0022-accept-api-requests-only-from-the-web-worker.md) | Accept API requests only from the web Worker | accepted |
| [0023](0023-draw-the-authenticator-qr-code-in-the-browser.md) | Draw the authenticator QR code in the browser | accepted |
| [0024](0024-write-schemas-with-zod-mini.md) | Write schemas with Zod Mini | accepted |
| [0025](0025-add-a-passed-class-instead-of-merging-it.md) | Add a passed class instead of merging it | accepted |
| [0026](0026-add-surface-and-state-colour-roles.md) | Add surface and state colour roles | accepted |
| [0027](0027-wrap-one-icon-set-in-the-design-system.md) | Wrap one icon set in the design system | accepted |
| [0028](0028-keep-theme-and-language-on-the-device.md) | Keep the theme and the language on the device | accepted |
| [0029](0029-draw-brand-marks-in-their-own-colours.md) | Draw brand marks in their own colours | accepted |
