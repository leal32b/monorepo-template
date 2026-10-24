# 0014. Host on Neon, Render and Cloudflare, deployed from GitHub Actions

- Status: accepted
- Date: 2026-10-24

## Context and problem statement

The tracer bullet must run for real: database, API and web on free tiers, deployed by a
repeatable process. The plan named Cloudflare Pages or Vercel for the web and Render or Koyeb
for the API, to be confirmed against that day's free tiers. Who deploys, and where does the
configuration live?

## Decision drivers

- Free tiers that allow commercial use and need no paid add-on to deploy.
- Only an image that passed CI reaches production; rollback is redeploying a known image.
- Configuration lives in the repository and in GitHub, not scattered across dashboards;
  secrets never enter the repository.
- The API and its database sit in the same region.
- The free database compute budget is not spent by health checks.

## Considered options

Free tiers as checked on 2026-10-24:

| Service | Free tier | |
| --- | --- | --- |
| Neon | No card; 1 GB per project, 100 CU-hours a month, suspends after 5 min idle | chosen |
| Render web service | 750 instance hours a month; sleeps after 15 min idle, ~1 min cold start; prebuilt images | chosen |
| Render Postgres | Expires 30 days after creation | rejected |
| Koyeb | One free instance (512 MB, 0.1 vCPU); since Feb 2026 reports of a card hold and paid start for new accounts | rejected (uncertain) |
| Cloudflare Workers static assets / Pages | Static asset requests free; Pages: 500 builds a month; commercial use allowed | chosen (Workers) |
| Vercel Hobby | 100 GB a month, personal and non-commercial use only | rejected |

Deploy:

1. GitHub Actions builds, publishes and deploys, using platform APIs.
2. Each platform's Git integration builds and deploys from `main`.
3. Render deploy hook (one secret URL per service) with variables kept in the Render dashboard.

## Decision outcome

**Hosting:** Neon (Postgres, `aws-us-east-1`), Render (API container, Virginia, free instance
from a public GHCR image), Cloudflare Workers static assets (web, single-page-application mode).

**Deploy:** option 1, `.github/workflows/deploy.yml`, run after CI succeeds on `main`, in the
GitHub Environment `production`:

- API: build the image, push `ghcr.io/<owner>/<repo>-api:<sha>`, replace the Render service
  variables with the ones from GitHub (`PUT /services/{id}/env-vars`), deploy that exact image,
  wait until it is live and smoke-test `/api/health`.
- Web: build with `VITE_API_BASE_URL` and run `wrangler deploy` (`cloudflare/wrangler-action`).

| GitHub `production` environment | |
| --- | --- |
| Secrets | `DATABASE_URL`, `RENDER_API_KEY`, `CLOUDFLARE_API_TOKEN` |
| Variables | `RENDER_SERVICE_ID`, `CLOUDFLARE_ACCOUNT_ID`, `CORS_ORIGINS`, `VITE_API_BASE_URL` |

One-time manual steps: create the accounts, the Neon project and the Render image-backed
service (free plan, health check path `/api/health/live`), and the API key and token.

**Runtime:** the container runs `migrate.js` and then `main.js`
([ADR 0013](0013-kysely-and-plain-sql-migrations.md)); the advisory lock makes concurrent
starts safe. `GET /api/health/live` does no I/O and is the platform health check;
`GET /api/health` probes the database and is what the status page shows. A health check that
hit the database every few seconds would keep Neon awake and spend its compute budget.

This brings "deploy after green CI" forward from Phase 8.

### Consequences

- Good: configuration is versioned; production runs the image CI built; rollback is a redeploy
  of an older tag.
- Good: no platform dashboard holds configuration that the repository does not describe.
- Bad: the first request after idle waits for Render (~1 min) and Neon to wake up.
- Bad: the Render API key is account-wide and `DATABASE_URL` lives in GitHub; both are limited
  to the `production` environment and `main`.
- Bad: `PUT env-vars` replaces the whole set, so a variable added by hand in Render is removed
  on the next deploy.
- Bad: `*.workers.dev` and `*.onrender.com` are different sites, which matters for cookies in
  Phase 6 ([ADR 0015](0015-cross-origin-access-with-a-cors-allowlist.md)).

## Revisit when

A free tier changes its terms, cold starts hurt real users, a custom domain is bought, or the
deploy needs preview environments per pull request.
