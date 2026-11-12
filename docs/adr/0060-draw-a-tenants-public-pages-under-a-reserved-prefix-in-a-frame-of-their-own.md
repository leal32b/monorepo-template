# 0060. Draw a tenant's public pages under a reserved prefix, in a frame of their own

- Status: accepted
- Date: 2026-11-12

## Context and problem statement

[ADR 0059](0059-open-a-public-surface-per-tenant-behind-a-rate-limiter-of-our-own.md) opened a public
surface on the API: `GET /api/public/organizations/:organizationSlug` (the organization as anyone may see
it) and `POST …/customer-registrations` (a visitor asks to be registered as a customer). Nothing in the
web reaches them. Every web route is either an entry screen (sign-up, sign-in, passwords) or sits behind
`RequireSession`, inside the one app frame ([ADR 0037](0037-keep-one-app-frame-across-screens.md),
[ADR 0039](0039-draw-every-signed-in-screen-in-the-one-frame.md)).

A visitor of a tenant (a barbershop's client) is neither: they have no account and never will, they came
for one organization, and the app's navigation, its brand link to `/` and its sign-in mean nothing to
them. This record decides the web's side: the address of a tenant's public page, how its route group
stays apart from the session, what frame it is drawn in, how its code stays apart from the other screens'
code, how its read starts and fails, and what it says for an organization that does not exist. A product
copies the pattern for each public page it adds (a booking page, a price list).

## Decision drivers

- A visitor's console shows no refused call, as on the entry screens
  ([ADR 0042](0042-ask-only-for-the-session-where-none-was-seen.md)): a public page never asks for the
  session, not even once.
- The address is short enough to print on a door and to type, and readable
  ([ADR 0034](0034-keep-the-organization-slug-in-the-web-url.md)); no organization slug may shadow it.
- One idea, one presentation: a narrow column with a heading, one form and the language picker is
  already a family, the entry screens'. A second frame for the same layout would be a second
  presentation.
- The sign-in screen and the first signed-in screen keep their JavaScript budgets
  ([ADR 0045](0045-run-the-end-to-end-suite-on-the-built-app-without-outside-services.md)) without
  raising them, and the public page gets a budget of its own.
- Reads follow [ADR 0038](0038-load-screen-data-through-router-queries-and-swap-screens-at-once.md):
  a router query started by the route's `preload`, read with `createRead`, failing through
  `ReadFailure`; a slow first read says why ([ADR 0041](0041-say-why-a-cold-start-takes-long-and-end-the-wait.md)).

## Considered options

The address:

1. A one-letter reserved prefix: `/p/:orgSlug`.
2. A word as prefix: `/public/:orgSlug`, `/book/:orgSlug`.
3. A suffix under the tenant's own path: `/:orgSlug/public`.
4. A subdomain per organization: `acme.example.com`.

The frame:

A. The entry screens' frame (`EntryLayout`), with the organization's name in the brand's place.
B. A widget of its own (`PublicLayout`).
C. The app frame, without its menus.

The code:

i. The page loaded on demand (`lazy`), in a chunk of its own, the rest of the first download unchanged.
ii. The page in the first download, beside the entry screens.
iii. A second entry point (`public.html`) with its own router and providers.

## Decision outcome

Chosen options: 1, A and i.

### The address: `/p/:orgSlug`

A tenant's public pages live under `/p/:orgSlug`; the reference page is `/p/:orgSlug` itself, and a
product adds its own under it (`/p/:orgSlug/book`). The letter `p` joins `reservedSlugs` in
`@repo/contracts`, so the API refuses it as a new slug and the routes' test keeps the list in step with
the router. `p` mirrors the API's `/api/public/organizations/:organizationSlug`.

Option 2 spends a word a shop might want as its slug and makes the printed link longer, for a word the
visitor does not read. A product that wants a word (`/book/`) renames the prefix in one place
(`publicPath` in `routes.tsx`) and reserves it. Option 3 sits in the members' address space: the tenant
guard and the session would have to tell a visitor's page from a member's, and `/:orgSlug/...` stays the
members'. Option 4 needs a wildcard domain and certificate (ADR 0059 rejected it for the API for the same
reason); a product that buys one rewrites the host to `/p/<slug>` in the Worker and keeps these routes.

The Worker needs nothing: `/p/...` is a page load and gets `index.html`, as every client route does.

### The route group: outside the session, its own `preload`

The group sits at the top of the router, beside the entry screens, outside `RequireSession`, so nothing
on it reads the session or the organizations. Its `preload` is `preloadPublic` in `routes.tsx`, not the
`preload` helper: that one imports the sessions entity to read the device's hint, which a public page
has no use for. `preloadPublic` imports the entity on demand and starts its query with the slug read at
once (ADR 0038), when the route opens, never on hover ([ADR 0040](0040-start-a-screens-reads-when-it-opens-not-on-hover.md)).
The app's start (`main.tsx`) waits for the sign-in options only on an entry screen, so a public page asks
for nothing but its own data.

### The read: a query of its own, in an entity of its own

`entities/public-organizations` holds `publicOrganizationQuery`, keyed by the slug, over
`publicOrganizationSchema`: the public projection, never the member's organization. The page reads it with
`createRead` inside `ReadFailure`; while it waits, `EntrySkeleton` holds the frame, with a placeholder
where the name will be, and after `motion.slowWaitDelay` the same notice as the app's skeleton says the
server may be waking up (the first request of a visitor is the one that wakes a sleeping host).

A failed read is said in the page's own words, in the same frame:

- `404 organization_not_found`: "There is no page at this address", with what to do (check the link with
  whoever gave it). No way to sign in or to the app's start: the visitor has nothing there. The brand's
  place holds the app's name, as plain text, since there is no organization to name.
- `429 rate_limited`: when to try again, from the problem's `retryAfter`, and the retry button.
- Anything else (the server out of reach, a time-out): the generic sentence and the retry.

### The frame: the entry screens', with the organization's name

The page is drawn in `EntryLayout`, which takes a `brand`: the text in the brand's place, drawn as
plain text instead of the app's name linked to `/`. On a public page it is the organization's name, which
wraps when long (80 characters). Title, description, the form, the language picker below: the same column,
sizes and order as every entry screen. A visitor sees whose page it is and nothing of the app's
navigation. Option B would copy the same markup into a second component that must stay in step. Option C
draws chrome a visitor cannot use.

### The code: a chunk of its own

The page is `lazy` in `routes.tsx`, so its code (the page, the registration form, its validation and the
entity) is a chunk of its own that the sign-in and the signed-in screens never download. What it needs
from the first download (the router, the providers, `EntryLayout`, the API client) is there for every
screen already. Its cold load is the first download, the language and its chunk; the end-to-end budget
test gives it a budget of its own, measured when it was built plus 5 KB, like the others. The sign-in and
signed-in budgets do not change.

Making it lazy changed how the build cut the first download: Rolldown (Vite 8) gives every module the
entry shares with a lazy chunk a common chunk of its own, and the new chunk's imports split the entry into
about fifteen small files, which cost the sign-in and signed-in loads 2 to 3 KB gzipped in headers and
repeated imports. The build now keeps what the entry imports statically in one file (`codeSplitting`
with a group on the `$initial` tag, in `vite.config.ts`). Measured on the end-to-end build: sign-in
75 KB before, 72 KB after; first signed-in screen 115 KB before, 112 KB after; the public page 76 KB.
The sign-in budget comes down to 77 KB, the signed-in one stays at 117 KB, and the public page's is
81 KB. The cost: a change to any module of the first download changes that one file's hash, so a deploy
invalidates all of it in the browser's cache instead of a part.

Option ii would put the public form into every sign-in's download. Option iii would duplicate the
providers, the router and the build's configuration for a page that shares all of them; it is the way out
if a product's public pages grow to need a different stack (server rendering for search engines).

### The form of the reference page

`features/customers/register-as-customer` holds the registration form. What is particular to a form for
visitors, and is the pattern to copy:

- **The same schema before the request.** The form checks with `publicCustomerRegistrationInputSchema`,
  so what it sends is what the API accepts, and the "email or phone" rule is said under the email field
  when both are empty. The rule is also said in the form before anyone trips on it, in the hint under
  the fields.
- **Autofill on.** Unlike a member's forms, where the name and email typed are someone else's (the
  design-system skill turns suggestions off there), a visitor types their own: the fields say `name`,
  `email` and `tel`, so the browser can fill them.
- **The honeypot.** `referralCode` is a text input out of view (`sr-only`-style placement off screen),
  `aria-hidden`, `tabindex="-1"`, `autocomplete="off"`, with no label a person reads. Its value is sent as
  it is. Its name is never changed to a word browsers fill.
- **One success, said honestly.** The API answers `202 { received: true }` whatever it found (ADR 0059),
  so the page says "we got it" and that the organization will reach them, never "you are registered" or
  "welcome": it cannot know which. The form gives way to the message, which takes the focus.
- **A refusal keeps what was typed.** 429 says when to try again from `retryAfter`; a failure to reach
  the server says so; both keep the fields filled. The button waits while the request is out, so a double
  click sends once; a write that takes longer than `motion.slowWaitDelay` says the server may be waking up.

### Consequences

- Good: a visitor's page asks only for its own data; no call is refused in their console.
- Good: the entry family gains one prop and no second frame; the public page moves like an entry screen.
- Good: the sign-in and signed-in downloads do not grow by the public page's code, and the first
  download, now one file, is 3 KB smaller.
- Good: a product adds a public page by copying one route, one query and one page.
- Bad: the slug `p` is taken from every organization; a database with an organization already called `p`
  must rename it before this ships.
- Bad: a visitor's cold load carries the first download, entry screens included; moving those behind
  `lazy` too would cut it, at the cost of one more request on the sign-in.
- Bad: every deploy that touches the first download invalidates it whole in the browser's cache.
- Bad: a public page is drawn by the browser, so a search engine that does not run scripts sees an empty
  page.
- Bad: the public page has the app's language picker and theme, but no way to set the organization's own
  colours or logo; a product that needs them adds them to `publicOrganizationSchema` and to the brand.

## Revisit when

A product needs its public pages indexed by search engines (server rendering, option iii), a tenant needs
its own domain (rewrite in the Worker), the public budget grows past the sign-in's by more than the
page's own form, or tenants ask for their own colours and logo on their page.
