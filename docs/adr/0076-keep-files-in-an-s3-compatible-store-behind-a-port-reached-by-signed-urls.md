# 0076. Keep files in an S3-compatible store behind a port, reached by signed URLs the API issues

- Status: proposed
- Date: 2026-11-20

## Context and problem statement

The pipeline accepts JSON bodies of at most 1 MiB and nothing else, by design (threat model T06, T15). There
is no place for a logo, an avatar, an attachment or a receipt, and the organization export
([ADR 0074](0074-record-the-terms-accepted-at-sign-up-and-export-an-organization-by-a-job-and-a-link.md))
keeps its zip in a `bytea` column until a store exists. The API runs on a host whose disk is gone at the
next deploy and is not shared between instances (Render, [ADR 0014](0014-hosting-and-deploy-from-github-actions.md)).

Six questions:

1. Where do files live, behind what, and how does a product change provider?
2. How does a file get there from the browser, and how are its size and type held to a limit?
3. How does the browser read one back: a signed address, or a public one for a logo?
4. What goes when an organization is deleted?
5. What becomes of the export?
6. How do `pnpm dev` and the end-to-end suite work with no account anywhere?

## Decision drivers

- Changing provider is configuration and at most one adapter, as for email
  ([ADR 0021](0021-send-email-through-a-provider-neutral-port.md)); development and tests need no account and
  no network.
- The bytes never cross the API on the way in: the API sleeps, wakes slowly and has a small memory, and the
  1 MiB JSON limit stays what it is.
- The tenant guard is the only way to a file: no file is reached by an address someone could guess, and
  no file of one organization is reached through another.
- Nothing the browser says about a file is believed: its size, type and dimensions are checked on the bytes.
- Free tiers: no egress charge for a few logos read on every screen, no second service to keep awake.
- One place per idea: one bucket, one CORS rule, one way to sign.

## Considered options

The store:

1. **An S3-compatible object store behind a port, Cloudflare R2 by default**, reached by a small SigV4
   signer of our own on `node:crypto`; a folder on disk in development and tests.
2. A provider's SDK (`@aws-sdk/client-s3`, `@google-cloud/storage`).
3. Postgres (`bytea`, as the export does today) or large objects.
4. The host's disk (a Render disk).

Uploads:

a. **A signed `PUT` the API issues after the tenant guard, then a confirmation the API verifies on the bytes
   and copies into place** (confirm, verify, promote).
b. A signed `POST` form with a policy (`content-length-range`).
c. The browser sends the file to the API, which writes it to the store.
d. The store tells the API when an object lands (S3 event notifications, R2 event notifications to a Queue).

Downloads:

i. **Signed `GET` addresses for everything, the logo's signed for a day at a time** so the browser caches it.
ii. A public bucket (or a public domain on it) for logos, signed addresses for the rest.
iii. Every file streamed through the API.

## Decision outcome

Chosen options: **1, a and i.**

### The store and the port

`FileStorage` (`libs/ports/file-storage.port.ts`) has six operations, all by key: sign an upload, sign a
download, `stat` (size and type, or `null`), `read`, `write` and `delete`, and `deletePrefix`. Two adapters:

- **`S3FileStorage`** (`libs/adapters/s3-file-storage.ts`) speaks the S3 API with `fetch`, signed by
  `libs/adapters/s3/sigv4.ts` (AWS Signature Version 4: the header form for its own calls, the query form for
  addresses it hands out), checked against AWS's published example. Path-style addresses
  (`<endpoint>/<bucket>/<key>`), which every compatible provider accepts. No SDK (option 2): the SDK is
  megabytes for five calls and a signer, and the signer is a page of code with a published test vector.
- **`LocalFileStorage`** (`libs/adapters/local-file-storage.ts`) keeps files under a folder (`STORAGE_DIR`,
  `.storage` by default) and signs its own addresses with an HMAC: see dev parity below.

**R2 is the default host** because the web is already deployed on Cloudflare (ADR 0014): the same account,
no new vendor, no egress charge, and 10 GB free. The endpoint is `https://<account id>.r2.cloudflarestorage.com`,
the region `auto`. **Another provider plugs in by configuration**: AWS S3 (`https://s3.<region>.amazonaws.com`
and its region), Backblaze B2, Wasabi, DigitalOcean Spaces, MinIO or Supabase Storage's S3 endpoint take the
same five variables. A provider without the S3 API (Google Cloud Storage's own API, Azure Blob) is one more
adapter of the same port.

**Choosing the adapter.** `STORAGE_ENDPOINT`, `STORAGE_BUCKET`, `STORAGE_ACCESS_KEY_ID` and
`STORAGE_SECRET_ACCESS_KEY` go together (all or none), `STORAGE_REGION` is `auto` unless said; with them the
S3 adapter, without them the local one. Env validation refuses the local adapter when the web origin is
`https`, as it refuses the email log (ADR 0021): a deployed API never keeps files on a disk that the next
deploy erases. The endpoint must be an `https` origin there.

Postgres (option 3) is the free tier's 0.5 GB and every read a query; the host's disk (option 4) is a paid
add-on on Render, one instance only, and gone with the service.

**Keys.** `libs/storage/keys.ts` is the only place that builds one, from ids the server generated:
`uploads/<organization id>/<upload id>`, `logos/<organization id>/<logo id>` and
`exports/<organization id>/<export id>.zip`. The kind comes first, so a lifecycle rule can name a kind; the
organization second, so its files are three prefixes. No key holds a name a user typed. The local adapter
also refuses a key with any other shape, so `..` never reaches the disk.

### Uploads (a: confirm, verify, promote)

1. **Sign.** `POST /api/organizations/:organizationId/logo/uploads` with `{ type, size }`, a tenant route with
   `organization:update` (owners and admins). The contract holds `type` to PNG, JPEG or WebP and `size` to
   1 MiB, so a request outside the limits is refused before anything is signed. Each organization may sign
   20 uploads an hour (`logo-upload`, the rate limiter of ADR 0059), counted before signing. The answer is an
   upload id, the address, the headers to send and when it expires: a `PUT` to `uploads/<org>/<id>`, valid
   **5 minutes**, whose signature covers `Content-Type` and `Content-Length`, so a store that checks signed
   headers refuses a body of another type or length.
2. **Upload.** The browser `PUT`s the file to that address, straight to the store.
3. **Confirm.** `PUT /api/organizations/:organizationId/logo` with `{ uploadId }` (a UUID, by contract), same
   guard. The API `stat`s `uploads/<org>/<id>`, built from the path's organization, so an upload id of another
   organization finds nothing: missing is `409 logo_upload_missing`, over the limit `logo_too_large`. Then it
   reads the bytes and **sniffs the type and dimensions from them** (`libs/files/image.ts`: the PNG, JPEG and
   WebP headers, no dependency): not one of the three is `logo_type_unsupported`, a side under 64 or over
   4096 pixels is `logo_dimensions`.
4. **Promote.** The API writes the verified bytes to `logos/<org>/<new id>` with the type it found (not the
   one the browser claimed) and `Cache-Control: private, max-age=86400, immutable`, records the logo
   (`organization_logo`: id, type, width, height, size, who and when) with an audit entry
   (`organization` / `logo-changed`) and enqueues the deletion of the old logo and of the upload, in one unit
   of work.

The limits are enforced three times: the contract before signing, the signed headers at the store, and the
bytes at confirmation, which is the only one that does not depend on the provider. A store that ignores
signed headers (some do) lets a larger upload land in `uploads/`, where the confirmation refuses it and the
lifecycle rule deletes it.

**Orphans.** An upload never confirmed (a closed tab, a refused file) stays in `uploads/` until a **lifecycle
rule deletes objects there after 1 day**, set on the bucket ([operations](../operations.md#file-storage)); the
local adapter's folder is a developer's to empty.

Why not the others: R2 does not implement `PostObject`, so a signed form with `content-length-range` (b) is
not portable; sending the file through the API (c) puts the bytes on the sleeping host and past the body
limit; event notifications (d) differ per provider, need a consumer (a Queue and a Worker on R2) and still
leave the API to verify the bytes. Confirm-then-verify asks one more request of the browser and keeps all
the rules in the API, on any provider. For a future file too large to read in memory (an attachment of
tens of megabytes) the confirmation `stat`s it and reads only its first bytes to sniff the type, and the
store copies it into place; the port grows a `copy` then.

**The logo row** is `organization_logo`, a tenant table (row-level security, ADR 0055), not Better Auth's
`organization.logo` column: the plugin's `/organization/update` lets any member with `organization:update`
write any string there, which would be an address of their choosing on every member's screen, or a key of
another organization's file. The plugin's column stays unused and out of the export, as it was.

### Downloads (i: signed for everything)

- **The export** is downloaded from the same route as before, `GET …/export/file`, behind `tenantRoutes`
  with `organization:export`; it now answers `302` to a signed `GET` of `exports/<org>/<id>.zip` valid
  **5 minutes**, which names the file as an attachment (`response-content-disposition`), with
  `Cache-Control: no-store` on the redirect. The guard stays the only way in, as ADR 0074 foresaw, and the
  page's link is unchanged.
- **The logo** reaches the web inside the membership read (`GET /api/organizations/:organizationId/me`), as
  the subscription does (ADR 0063): `logo: { url, width, height } | null`, so the frame draws it with no
  request of its own. Its address is a signed `GET` whose signing instant is the start of the UTC day and
  whose life is 2 days: the same address all day for every member, so the browser keeps the image
  (`max-age=86400`) instead of fetching it on every screen, and any address handed out stays valid at least a
  day.
- **The privacy trade-off.** A public bucket (ii) would give logos a permanent address with no signing, and
  the public pages (ADR 0060) could show one without a session; but anyone holding the address reads it
  forever, the bucket needs a public domain (R2's `r2.dev` is rate limited and not for production; a custom
  domain needs a Cloudflare zone the template does not assume), and there would be two buckets, two CORS rules
  and two ways to read a file. With signing, a logo's address works for at most 2 days after it was handed out,
  removing the logo deletes the object so the address dies at once, and someone removed from the organization
  keeps a day-old address to a logo they had already seen. A product that shows logos on its public pages
  signs them the same way in its public route.
- Streaming through the API (iii) wakes the API for every image and spends its memory and bandwidth.

### Deletion

- **A logo removed** (`DELETE /api/organizations/:organizationId/logo`, same guard, open while read only as
  every `DELETE` is) loses its row, records `organization` / `logo-removed`, and enqueues the deletion of its
  object in the same unit of work, so the object goes only if the row did.
- **The object deletions run on a job**, `storage.delete-files` (5 attempts, `libs/storage/delete-files.ts`):
  deleting a missing key succeeds, so a retry is harmless, and a store that is down delays a deletion instead
  of failing the request.
- **An organization deleted**, by its owner or with its only member's account, runs the
  `OrganizationDeletionListener`s (ADR 0067) before its rows go: billing's, and now storage's, which enqueues
  `storage.delete-organization` with its id. The job deletes the organization's three prefixes, so the logo,
  the export and any upload in flight go with it; the rows of `organization_logo` and `organization_export`
  go by cascade. The composition root hands identity one listener that calls each in turn.

### The export moves to the store

The build job writes the zip to `exports/<org>/<export id>.zip` instead of the column, and enqueues
`storage.delete-files` for it **at its expiry** (`runAt`, ADR 0056), so the file goes 7 days after it is ready
whatever happens to the row. A new request that replaces a ready export enqueues the deletion of the old file
at once. The daily purge no longer empties export files (`purge-expired-exports` is gone); a lifecycle rule
deleting `exports/` after 8 days is the net under a job that failed for good. The key is the export's id, so
the row stores no key.

Migration `0017` drops `organization_export.file`. The rows that still hold a file are marked expired at that
instant rather than moved: SQL cannot write to the store, a move job would keep the column alive for one more
deploy, and what it moves is a copy at most 7 days old that the owner rebuilds with one click (the page says
"expired on" that day, and the 15 minutes since the request are long past).

### Dev parity

The local adapter's addresses are paths of the API itself: `/api/storage/<key>?expires=…&signature=…`, with the
type and size for an upload and the file name for a download in the signed query. The signature is an
HMAC-SHA256 under a key derived from `BETTER_AUTH_SECRET`, so addresses survive a restart of `pnpm dev`.
`GET /api/storage/*` serves the file with its type, and `PUT /api/storage/*` takes the body (the one route
whose body is not JSON: the router marks it raw, and the handler reads at most the signed size and checks the
signed type). Both refuse an expired or forged signature with `403`. The routes exist only when the local
adapter is chosen, which env validation keeps away from `https`.

Being paths of the API, they reach the browser through Vite's proxy in `pnpm dev` and in the end-to-end
suite's `vite preview`, on the web's own origin: the same requests as production, `PUT` then confirm, with
`'self'` enough for the CSP. The suite's API gets a fresh folder per run.

### Configuration and deploy

- The API reads the five `STORAGE_*` variables; the deploy sends them to Render as it sends the others:
  `STORAGE_ENDPOINT`, `STORAGE_BUCKET` and `STORAGE_REGION` as variables, the two keys as secrets.
- The web's CSP (`apps/web/public/_headers`) names the store in `img-src` and `connect-src` through the token
  `STORAGE_ORIGIN`, which the build replaces with `STORAGE_ORIGIN` from the environment (the deploy passes
  `STORAGE_ENDPOINT`), and with nothing in `pnpm dev`, the suite and `vite preview`, where the store is the
  page's own origin. The smoke test checks the deployed CSP names it.
- The bucket's CORS allows `PUT` and `GET` from the web origin with the `Content-Type` header; the key is an
  R2 API token with Object Read & Write on that bucket alone. [operations](../operations.md#file-storage) lists
  what the owner creates.

### Consequences

- Good: an organization's logo, and any file a product adds, goes straight to a store any S3-compatible
  provider serves, with no SDK and no new dependency.
- Good: every limit is checked on the bytes by the API, so a lax provider or a forged request lands nothing
  that is shown.
- Good: the export leaves Postgres; at most one zip per organization rests in the store for a week.
- Good: deleting an organization leaves none of its files, by prefix, on a job that retries.
- Good: `pnpm dev` and the suite run the same flow with no account.
- Bad: an upload is three requests (sign, `PUT`, confirm), and the logo's bytes cross the API once at
  confirmation (at most 1 MiB).
- Bad: a leaked logo address works up to 2 days; a removed member keeps the one they had.
- Bad: one more provider account, a bucket, a token and a CORS rule to keep; a CORS rule left out shows as an
  upload that fails in the browser, which the page says.
- Bad: the deployed CSP depends on a variable of the build; the smoke test fails a deploy that leaves it out.
- Bad: an export that was ready when `0017` ran must be asked for again.

## Revisit when

A product stores files too large to read in memory (add `copy` and a ranged sniff, or multipart uploads); a
logo is shown on the public pages to visitors (sign it there, or reconsider a public domain); the bucket's
egress or operations show on a bill; or a provider without the S3 API is chosen (write its adapter).
