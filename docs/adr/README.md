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
| [0027](0027-wrap-one-icon-set-in-the-design-system.md) | Wrap one icon set in the design system | accepted; set superseded by [0032](0032-draw-icons-from-phosphor-generated-from-its-svgs.md) |
| [0028](0028-keep-theme-and-language-on-the-device.md) | Keep the theme and the language on the device | accepted |
| [0029](0029-draw-brand-marks-in-their-own-colours.md) | Draw brand marks in their own colours | accepted |
| [0030](0030-add-a-scrim-colour-role.md) | Add a scrim colour role | accepted |
| [0031](0031-animate-layers-with-short-transform-and-opacity-motion.md) | Animate layers with short transform and opacity motion | accepted |
| [0032](0032-draw-icons-from-phosphor-generated-from-its-svgs.md) | Draw icons from Phosphor, generated from its SVGs | accepted |
| [0033](0033-organizations-with-roles-in-the-database-behind-a-path-guard.md) | Run organizations on Better Auth, with roles in the database, behind a guard on the path | accepted; tenant queries backed by row-level security in [0055](0055-keep-tenants-apart-with-row-level-security-set-by-the-unit-of-work.md) |
| [0034](0034-keep-the-organization-slug-in-the-web-url.md) | Keep the organization slug in the web URL | accepted |
| [0035](0035-show-the-server-working-with-one-progress-bar.md) | Show the server working with one progress bar | accepted; what drives the bar superseded by [0038](0038-load-screen-data-through-router-queries-and-swap-screens-at-once.md) |
| [0036](0036-keep-the-screen-until-the-next-one-is-ready.md) | Keep the screen until the next one is ready | superseded by [0038](0038-load-screen-data-through-router-queries-and-swap-screens-at-once.md) |
| [0037](0037-keep-one-app-frame-across-screens.md) | Keep one app frame across screens | accepted; the guard's placeholder superseded by [0038](0038-load-screen-data-through-router-queries-and-swap-screens-at-once.md); its screens extended by [0039](0039-draw-every-signed-in-screen-in-the-one-frame.md); its service status removed by [0043](0043-remove-the-service-status-from-the-web.md) |
| [0038](0038-load-screen-data-through-router-queries-and-swap-screens-at-once.md) | Load screen data through the router's queries, and swap screens at once | accepted; a hovered link's reads superseded by [0040](0040-start-a-screens-reads-when-it-opens-not-on-hover.md); the boot's reads beside the session narrowed by [0042](0042-ask-only-for-the-session-where-none-was-seen.md) |
| [0039](0039-draw-every-signed-in-screen-in-the-one-frame.md) | Draw every signed-in screen in the one frame | accepted; its service status removed by [0043](0043-remove-the-service-status-from-the-web.md) |
| [0040](0040-start-a-screens-reads-when-it-opens-not-on-hover.md) | Start a screen's reads when it opens, not when its link is hovered | accepted |
| [0041](0041-say-why-a-cold-start-takes-long-and-end-the-wait.md) | Say why a cold start takes long, and end the wait | accepted |
| [0042](0042-ask-only-for-the-session-where-none-was-seen.md) | Ask only for the session where none was seen | accepted |
| [0043](0043-remove-the-service-status-from-the-web.md) | Remove the service status from the web | accepted |
| [0044](0044-build-customers-as-the-reference-vertical-module.md) | Build customers as the reference vertical module | accepted; its saves amended by [0048](0048-refuse-a-stale-save-with-a-version-per-record.md); "How to copy the module" extended by [0052](0052-run-a-use-cases-writes-in-one-transaction-through-a-unit-of-work.md) |
| [0045](0045-run-the-end-to-end-suite-on-the-built-app-without-outside-services.md) | Run the end-to-end suite on the built app, without outside services | accepted |
| [0046](0046-observe-through-structured-logs-tagged-with-the-release.md) | Observe through structured logs tagged with the release | accepted |
| [0047](0047-put-time-limits-on-every-database-wait.md) | Put time limits on every database wait | accepted |
| [0048](0048-refuse-a-stale-save-with-a-version-per-record.md) | Refuse a stale save with a version per record | accepted |
| [0049](0049-delete-an-account-from-an-emailed-link.md) | Delete an account from an emailed link | accepted |
| [0050](0050-purge-expired-rows-daily-from-a-job-of-its-own.md) | Purge expired rows daily, from a job of its own | accepted |
| [0051](0051-propose-dependency-updates-with-renovate.md) | Propose dependency updates with Renovate | accepted |
| [0052](0052-run-a-use-cases-writes-in-one-transaction-through-a-unit-of-work.md) | Run a use case's writes in one transaction through a unit of work | accepted; `run` takes the organization and every tenant use case opens one since [0055](0055-keep-tenants-apart-with-row-level-security-set-by-the-unit-of-work.md) |
| [0053](0053-keep-time-zone-and-currency-on-the-organization-and-money-in-minor-units.md) | Keep the time zone and the currency on the organization, and money in minor units | accepted |
| [0054](0054-name-the-row-family-for-lists-not-for-settings.md) | Name the row family for lists, not for settings | accepted |
| [0055](0055-keep-tenants-apart-with-row-level-security-set-by-the-unit-of-work.md) | Keep tenants apart with row-level security, set by the unit of work | accepted |
| [0058](0058-split-the-i18n-dictionaries-by-slice-and-merge-them-per-language.md) | Split the i18n dictionaries by slice and merge them per language | accepted |
