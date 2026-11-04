# 0034. Keep the organization slug in the web URL

- Status: accepted
- Date: 2026-11-04

## Context and problem statement

[ADR 0033](0033-organizations-with-roles-in-the-database-behind-a-path-guard.md) makes the API learn
the tenant only from its path. The web needs its own answer to the same question. When a member of
several organizations opens a screen, which organization is it for? And does a link sent to a
teammate open the same one? Today every screen sits at the root (`/`, `/settings/...`), with no
tenant in the URL.

## Decision drivers

- A shared link opens the same tenant for the teammate who receives it.
- Two tabs on two organizations never mix: each tab knows its tenant without asking the server.
- The URL reads well to a person: a name, not a 32-character id.
- An unknown organization and one the visitor does not belong to look the same, as in the API.
- Account screens (profile, security, preferences) are not about any organization.

## Considered options

1. The slug as the first path segment, `/:orgSlug/...`.
2. The organization id as the first path segment, `/o/:organizationId/...`.
3. No tenant in the URL: the session's active organization, through Better Auth's `setActive`.
4. One subdomain per organization, `acme.example.com`.

## Decision outcome

Chosen option 1.

### Routes

- Tenant screens live under `/:orgSlug`:
  - `/:orgSlug` is Home;
  - `/:orgSlug/settings/general`, `/members` and `/roles` are the organization part of Settings;
  - Phase 7's screens follow the same pattern.
- These routes stay outside the slug:
  - entry: `/login`, `/login/two-factor`, `/signup`, `/forgot-password`, `/reset-password`;
  - account: `/account`, and `/settings/profile`, `/security` and `/preferences`;
  - onboarding ("Name your organization");
  - invitations: `/invitations/:id`.
- Settings shows both groups in one menu. The organization links carry the current slug.

### Slugs

- A slug is lowercase letters, digits and single hyphens, at most 48 characters. The schema lives in
  `@repo/contracts`, and the API enforces it too (ADR 0033).
- Words used by top-level routes are reserved, so no slug can shadow a route: `login`, `signup`,
  `settings`, `account`, `invitations`, `onboarding`, `api` and the rest. The list lives beside the
  slug schema.
- A test in the web checks that every top-level route of the router is on that list. A new route
  therefore cannot be shadowed by an existing slug.

### Resolution

- The web resolves a slug only from the caller's own organization list
  (`organization/list`). It then calls the API with the organization id.
- A slug not on that list shows the same not-found page, whether the organization does not exist or
  the caller is not a member.
- The web never calls `setActive` and never reads the session's active organization.

### `/` and the last organization

- `/` goes to the last organization used on this device, if the caller is still a member of it.
  Otherwise it goes to the only organization, or to the first one in the list.
- With no organization at all, `/` goes to pending invitations or to onboarding (ADR 0033, D4).
- The last slug is kept on the device, like the theme and the language
  ([ADR 0028](0028-keep-theme-and-language-on-the-device.md)). It is a convenience, never a source of
  truth.

### Renaming a slug

- Changing a slug breaks the links that used the old one; no history of old slugs is kept.
- The General screen says so before the change.
- Ids stay the API's key, so nothing on the server breaks.

### Why not the others

- **Option 2, the id.** It is just as safe and never changes, but a URL made of a 32-character id is
  hard to read or say. Slugs cost a resolution step and break on a rename.
- **Option 3, the session.** A link carries no tenant, so a teammate opens whatever organization their
  own session points at. All tabs share one active organization. This is the stale-tab case that
  ADR 0033 rules out in the API.
- **Option 4, subdomains.** They need wildcard DNS and certificates, a cookie for every subdomain, and
  CORS across hosts. All of that works against [ADR 0019](0019-reach-the-api-through-the-web-worker.md)
  (one web origin) and the free hosting.

### Consequences

- Good: a link names its tenant, and each tab keeps its own.
- Good: the web's 404 matches the API's, so probing slugs through the web learns nothing more than the
  plugin already tells.
- Bad: every screen under `/:orgSlug` waits for the organization list before it can resolve the slug.
  The list is small and cached with the session.
- Bad: a slug rename breaks bookmarks and shared links.
- Bad: reserved words must stay in step with the router; the test keeps them in step.

## Revisit when

- Users complain about broken links after a slug rename: keep the old slugs as redirects.
- A product wants each organization on its own host, or a custom domain per customer.
