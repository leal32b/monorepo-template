# Security policy

## Supported versions

Only `main` is supported: fixes land there and are deployed from there. A product built from this
template owns its copy and takes fixes from here by hand.

## Reporting a vulnerability

Please do not open a public issue. Report it privately through GitHub: the repository's **Security**
tab, **Report a vulnerability**. Include what an attacker can do, the steps or a proof of concept,
and the commit or the URL you tested.

What to expect:

- An acknowledgement within 5 business days.
- An assessment, and a fix date when it is confirmed, within 15 business days.
- Credit in the fix's pull request, if you want it, once the fix is deployed.

Please test only against your own deployment or a local copy (`pnpm dev`), never against another
person's data, and give us a reasonable time to fix before you disclose.

## Scope

In scope: the code in this repository, its configuration (`_headers`, `wrangler.jsonc`,
`apps/api/Dockerfile`) and its GitHub Actions workflows.

Out of scope: the hosting and email providers themselves, volumetric denial of service, attacks
that need a compromised device or browser, and missing hardening with no exploit path.

## What is in place

The threats, their mitigations and the accepted risks are in the
[threat model](docs/security/threat-model.md). In short: the API accepts requests only from the web
Worker; a strict CSP and security headers on every response; writes checked by origin; sessions,
passwords, two-step verification and rate limits through Better Auth; tenant data behind a guard
that answers 404 to non-members; secrets only in the GitHub `production` environment; a weekly
`pnpm audit` in CI.

## For a product built from this template

Turn on **Private vulnerability reporting** in the repository's settings (Security), or replace the
reporting section with your own contact, and keep the threat model current: it changes in the same
pull request as any change to a flow, a provider or a trust boundary.
