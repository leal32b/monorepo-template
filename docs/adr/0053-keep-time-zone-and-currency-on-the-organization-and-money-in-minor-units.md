# 0053. Keep the time zone and the currency on the organization, and money in minor units

- Status: accepted
- Date: 2026-11-11

## Context and problem statement

An organization has a name and a slug ([ADR 0033](0033-organizations-with-roles-in-the-database-behind-a-path-guard.md)).
It has no time zone and no currency, the contracts have no money type, and the web's one formatter is
`formatDate`, which writes the date of an instant in the device's zone.

The first product module that schedules something or charges for something then has no convention to
follow. The classic defects follow:

- an appointment drawn in the viewer's zone instead of the business's;
- a calendar date shifted by a day once it passes through `Date` and UTC;
- money held as a float, or as a number with no currency.

This record answers four questions:

- Where do an organization's time zone and currency live?
- How are they asked for and changed?
- How do money, instants, calendar dates and wall-clock times travel between the API and the web?
- How does the web write them?

The language stays on the device ([ADR 0028](0028-keep-theme-and-language-on-the-device.md)): two
members of one organization may read it in two languages, but they work in one time zone and one
currency.

## Decision drivers

- A product module copies one convention for money and time, checked by a schema, rather than
  inventing one.
- An organization's settings come with the organization wherever the web already reads it. No extra
  round trip per screen.
- Creating an organization stays one request: no organization without its settings, even for a
  moment.
- Only whoever holds `organization:update` changes them, by the same rule as the name.
- Few support contacts: sensible defaults at creation, and amounts that never change meaning when a
  setting changes.

## Considered options

For where the settings live:

1. Additional fields on Better Auth's `organization` table (`schema.organization.additionalFields`
   of the plugin).
2. A table of ours, `organization_settings`, keyed by the organization's id, behind our own routes and
   contracts.

For how money travels:

- a. An integer amount in the currency's minor units, with its ISO 4217 code.
- b. A decimal string ("12.50") with its code.
- c. A number in major units.

## Decision outcome

Chosen options 1 and a.

### The settings, on Better Auth's organization table

- `auth.organization` gains `timeZone` and `currency`, both `text not null`
  (`migrations/0008_organization_settings.sql`, as `auth:schema` prints it). Their defaults, `UTC`
  and `USD`, only fill the organizations made before and rows written outside Better Auth (a seed,
  a test). Every creation through the API must state both.
- `auth.ts` declares them as additional fields of the organization plugin: `required` and `input`.
  The plugin then, in Better Auth 1.7.14 (read in its source, since the documentation says little
  here):
  - adds them to the body of `organization/create` (required) and of `organization/update` (each
    optional);
  - hands them to `beforeCreateOrganization` and `beforeUpdateOrganization`;
  - returns them from `organization/list` and `get-full-organization`.
- **Validation.** `checkOrganization`, already run in both hooks for the name and the slug, checks them
  with the `@repo/contracts` schemas. The plugin itself only checks that they are strings.
  - `INVALID_TIME_ZONE`: a zone that is not an IANA name the runtime knows.
  - `INVALID_CURRENCY`: a code outside the currencies offered.
- **Permission.** An update goes through the plugin's own check of `organization:update`, which knows
  our custom roles. No new path, guard or contract. This stays inside the contracts exception of
  [ADR 0020](0020-authenticate-with-better-auth.md).
- **Web.** The client declares the same fields (`inferOrgAdditionalFields`), and the organizations
  list, read once for every screen below the session guard, carries them. `useOrganization()` gives
  every tenant screen the time zone and the currency with no new read.

### Asked at creation, edited in General

- The creation form asks for the name, the time zone and the currency. The defaults come from the
  browser:
  - the zone from `Intl.DateTimeFormat().resolvedOptions().timeZone`;
  - the currency guessed from the region of the browser's language (`pt-BR` gives `BRL`, `de-DE`
    gives `EUR`), and `USD` when the region is unknown or its currency is not offered.

  Most people only type the name.
- The General screen shows both as rows with a preview in the organization's settings: the time now
  in its zone, and an amount in its currency. Whoever holds `organization:update` changes each in a
  panel, as the name and the address are changed.
- Time zones are listed from `Intl.supportedValuesOf('timeZone')`, with the current one kept even if
  this browser does not list it. Currencies are named in the reader's language by
  `Intl.DisplayNames`, so no dictionary holds currency names.

### Conventions in `@repo/contracts`

| Idea | Schema | On the wire | Example |
| --- | --- | --- | --- |
| Money | `moneySchema` | `{ amount, currency }`: `amount` is a safe integer in the currency's minor units | `{ "amount": 1250, "currency": "BRL" }` is R$ 12,50 |
| Currency | `currencySchema` | an ISO 4217 code from `currencies`, which also says how many minor digits each has | `"JPY"` (0 digits) |
| Instant | `instantSchema` | ISO 8601 in UTC, with `Z` | `"2026-11-11T17:30:00Z"` |
| Calendar date | `calendarDateSchema` | `YYYY-MM-DD`, with no zone | `"2026-11-11"` |
| Wall-clock time | `wallClockTimeSchema` | `HH:MM`, 24-hour, with no zone | `"09:30"` |
| Time zone | `timeZoneSchema` | an IANA name | `"America/Sao_Paulo"` |

- **Money always carries its currency.** The organization's currency is the default for new amounts,
  not a property of stored ones. Changing it later relabels nothing that was already saved.
  - A product stores money as a `bigint` amount and a `text` currency.
  - Sums and comparisons happen only between amounts of one currency.
  - Conversion is out of scope.
- **Minor digits** are ISO 4217's, held in `currencies` so the API and the web agree; they do not rely
  on the runtime's ICU data. The list offered is short (12 currencies). A product adds a code and
  its digits there.
- **An instant** is a moment: `createdAt`, a payment, the start of an appointment. It is stored as
  `timestamptz` and drawn in the organization's zone.
- **A calendar date** is a day that is the same everywhere: a birthday, a due date, a holiday. It
  never goes through `Date`, which would move it across midnight. In Postgres it is `date`.
- **A wall-clock time** is a time of day with no day and no zone: opening hours, a recurring slot. In
  Postgres it is `time`. A date, a wall-clock time and the organization's zone together make an
  instant. That conversion is written when the first module needs it, on `Temporal` once Node and the
  browsers ship it.
- **Changing the time zone** moves no stored instant: they are UTC and are drawn again in the new
  zone. Wall-clock times keep their meaning in the new zone.

### Formatters in `apps/web/src/shared/lib`, one per idea

| Formatter | Writes | Example (`pt-BR`) |
| --- | --- | --- |
| `formatMoney(money, locale)` | an amount, with the currency's symbol and its minor digits | `R$ 12,50` |
| `formatDateTime(instant, timeZone, locale)` | the date and time of an instant in a zone, the zone named | `11 de nov. de 2026, 14:30 BRT` |
| `formatTime(time, locale)` | a wall-clock time in the reader's 12- or 24-hour habit | `09:30`; `9:30 AM` in `en` |
| `formatDate(date, locale)` | unchanged: the date of an instant on the device | `11 de nov. de 2026` |

- `formatDate` stays as it is. Its callers write dates about the user (a member since, an
  invitation's expiry), where the device's zone is the reader's.
- A product screen that shows an instant of the organization's business uses `formatDateTime` with
  `useOrganization().organization.timeZone`.

### Why not the others

- **Option 2, a table of ours.**
  - Creating an organization would take two requests, with an organization briefly existing without
    settings, or a failure between them leaving one forever.
  - Every screen would need a second read, or a join into a response the plugin owns.
  - We would add routes, contracts and a permission check that the plugin already has for the name.
  - Its one gain is independence from the plugin's schema. ADR 0033 already depends on that schema,
    and its hook tests through HTTP watch it.
- **Option b, a decimal string.** It is exact, but each side must parse it before any arithmetic,
  and nothing stops "12.5" beside "12.50".
- **Option c, major units in a number.** 0.1 + 0.2 is not 0.3.

### Consequences

- Good: one request creates an organization with its settings, and every tenant screen has them
  without a new read.
- Good: a product module has one schema per idea of money and time, and one formatter per idea, all
  tested in the three languages.
- Good: amounts and instants never change meaning when a setting changes.
- Bad: two more columns on a table the plugin owns. A Better Auth upgrade that changes additional
  fields shows in the `auth:schema` diff and in the organization tests through HTTP.
- Bad: the plugin checks only that the fields are strings. Our hook is the real check, so the hook
  tests through HTTP must stay.
- Bad: no API module reads the settings yet. The first one that needs them (a reminder at 9:00 in the
  organization's zone) adds a read of them to identity's ports.
- Bad: time zones valid in one ICU build may be unknown to another. The API refuses what its runtime
  does not know, and the General screen keeps an unlisted current value.
- Bad: `formatTime` has no caller yet: it is exported as `@public` for the first module with
  opening hours or slots.

## Revisit when

- A product needs a locale, a fiscal year or a week start per organization: add fields beside these.
- A product needs several currencies in one sum, or conversion.
- `Temporal` ships in Node and every supported browser: the date, time and zone conversions move to
  it.
- A Better Auth upgrade drops or changes organization additional fields.
