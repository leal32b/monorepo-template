# 0066. Hold a list screen's state in shared helpers, and its toolbar and pager in components

- Status: accepted
- Date: 2026-11-12

Amends "How to copy the module" of [ADR 0044](0044-build-customers-as-the-reference-vertical-module.md)
for the web: a module's list screen is built from these pieces, and copies only its rows. It uses the
loading rules of [ADR 0038](0038-load-screen-data-through-router-queries-and-swap-screens-at-once.md) and
[ADR 0040](0040-start-a-screens-reads-when-it-opens-not-on-hover.md), and the row family of
[ADR 0054](0054-name-the-row-family-for-lists-not-for-settings.md), unchanged.

## Context and problem statement

The customers page was 305 lines. About 80 of them were not about customers but about any list:

- the state, 41 lines: six signals (the filter, the search typed and the search applied, the page, a
  row's status and the section's), the key, the read, an effect that gives way to the page before when
  a page empties, and the functions that clear what was said and move the page;
- the search form and the filter, with their layout (25 lines);
- the pager's wiring (12 lines).

The next module's list would copy them, as the members, invitations and roles screens had already
copied the pair of statuses (a line in the row, a line below the section) and the audit and customers
dictionaries the words of a pager. P1-3 of the product readiness plan asks that a second list screen
need no copied block.

How does a list screen hold its state and draw its toolbar and pager, while the rows, which differ
from module to module, stay in the module?

## Decision drivers

- One idea has one presentation; markup copied between screens is a component missing
  ([`design-system` skill](../../.claude/skills/design-system/SKILL.md)).
- FSD: `shared` knows no entity and no page ([ADR 0010](0010-web-architecture-feature-sliced-design.md)), and
  `packages/ui` holds no text and no app state ([ADR 0017](0017-build-the-web-ui-from-the-design-system-first.md)).
- A list reads through `createRead`, keyed by its query (ADR 0038), and after a change draws it at once
  or asks again by its key.
- Today's behaviour stays exactly: the page's 30 tests pass unchanged.
- Nothing is added that has no user.
- Plain functions and components: no framework of lists, no configuration language.

## Considered options

1. Keep the page as the example and tell people to copy it.
2. One component, `ListScreen`, that draws the whole list from a configuration: the query, the filters,
   a function for the row, the actions.
3. Helpers for what a list holds and says (`createList`, `createListStatus`), and components for what it
   draws that every list shares (`ListToolbar`, `ListPager`). The screen keeps its rows, panels and forms.
4. Option 3, with the filter, the search and the page held in the URL (`?status=archived&q=ada&page=2`).

## Decision outcome

Chosen option: "3".

- **Option 1** is the cost this record removes.
- **Option 2** hides the rows, which are where modules differ: their actions, which role sees which,
  the panel each opens. A configuration grows a field for each difference, as ADR 0065 found for
  routes.
- **Option 4** gives the back button and shareable links, but it decides something else: every filter
  or page becomes an entry in the history, and each `preload` must read search parameters (ADR 0040
  reads `params` at once; the router changes them only when its transition commits). It is a product
  decision, not part of the mould. `createList` is the one place that would change, so deferring it
  costs nothing now.

### `createList`, in `shared/lib/list`

```ts
const list = createList({
  query: customersQuery(api),                                    // the entity's createQuery
  args: ({ filter, search, page }) => [id, filter, search, page], // what the query takes
  filter: 'active' as CustomerStatus,                             // left out when the list has none
  onChange: () => {                                              // before a filter or a search changes the view
    panels.dismiss()
    status.forget()
  }
})
```

- It holds the filter, the search (what is typed in the box, and the words applied), the page, and the
  read of that page with `createRead`, keyed by `query.keyFor(...args)`.
- Typing asks nothing. `find()` applies the typed text without its spaces, from the first page;
  `show(filter)` chooses a filter from the first page. Both call `onChange` first.
- `next`, `previous`, `hasNext`, `hasPrevious` and `pages` (at least 1, from `total` and `pageSize` as the
  API answers them).
- A page that empties because its last row left gives way to the one before it.
- `draw(change)` puts a change on the page at once, on every screen that reads it (`updateRead`);
  `again()` asks the API again (`readAgain`). Both act on the key of the page asked for.
- `args` is typed `[...A]`, so an array literal is read as the tuple the query takes. The organization is
  the query's first argument, since a tenant list is always one organization's.
- It lives in `shared/lib` because it imports no entity: it takes the query. The route's `preload` must
  ask for the first page the list asks for, with the same arguments; if not, the key differs and the page
  is read twice.

### `createListStatus`, in `shared/lib/list`

`createListStatus(panels)` keeps the two lines a list says about what the user just did: `row(id)` for
`ListRow`'s `status`, `section()` for `ListSection`'s (which takes focus), `sayRow`, `saySection`,
`left(text)` (a row left the list: dismiss the panel it had open and say so) and `forget()`. The
customers, members, invitations and roles screens use it, in place of four copies of the same signals.

### `ListToolbar`, in `packages/ui`

The search (a `Field` of type `search`, applied when the form is sent, by its button or the keyboard)
with the filter as its children, usually a `SegmentedControl`. It stacks on a phone and lies side by side
where it has room, by its own width (a container query), not the screen's. The caller passes every text.

### `ListPager`, in `shared/ui`

A `Pager` wired to a `createList`: the page drawn (it lags the page asked for while the next one comes),
the two ends, and nothing for a list of one page. The words every list uses (`list.pager.previous`,
`next` and `page`) are shared, in the `shell` dictionary group, with `actions.find` for the search
button. They had been `customers.pager.*` and `customers.search.submit`. It is in `shared/ui` and not in
`packages/ui` because the words are the app's. The audit trail pages by a cursor, which is another state:
it keeps `Pager` and its own words.

### Left in the page, on purpose

- The rows, their actions, their panels and what each role sees.
- Which empty state to show (nothing yet, nothing archived, nothing found for the words searched). The
  rule is the same in every list, but its texts and icons are the module's own.
- The screen's gate: `AppShell`, the view without `read`, and `ReadFailure`. The customers and audit
  screens repeat it in about 20 lines each.
- The page test's providers (about 35 lines, in every page test).

### Measured on the reference module

| | Before | After |
| --- | --- | --- |
| customers web slices, tests and texts included | 29 files, 2,577 lines | 29 files, 2,513 lines |
| `customers-page.tsx` | 305 lines | 259 lines |
| members, invitations and roles screens | | 25 lines fewer |
| the list's state, toolbar and pager in the page | 78 lines | about 25 lines, 8 of them the filter's own |
| written once: `createList`, `createListStatus`, `ListToolbar`, `ListPager`, with tests | | 9 files, 710 lines (484 of them tests), and the shared words, 9 lines in each language |

The page test, 506 lines with 30 tests, is unchanged. A spike built a throwaway `projects` screen from
the pieces: a list with a search and a pager, an entity of 19 lines and a page of 70. Its state, toolbar
and pager took 16 lines, and it copied no block of the customers page except the screen's gate. It was
not kept.

### Consequences

- Good: a list screen is its rows. The state, the toolbar and the pager of a second module are about
  16 lines, and the words of the pager and of "Find" are written once.
- Good: a change to how every list behaves (the emptying page, the search) has one place.
- Good: the four screens that said what just happened do it the same way.
- Bad: the customers slices shrink by 64 lines only; most of a list screen is its rows and forms, which
  are the module's. The gain is for the next module.
- Bad: `createList` serves a list paged by number, with one filter and one search. A list paged by a
  cursor, with two filters or with sorting, needs more, and must not grow this helper without a user.
- Bad: removing the customers module leaves `createList`, `ListToolbar` and `ListPager` without a user
  until the product builds its own list screen. `docs/using-the-template.md` says so.
- Bad: the state is not in the URL: reloading or sharing the address loses the filter, the search and the
  page, as before.

## Revisit when

A product wants the back button or a shareable link to keep a list's filter, search and page (option 4),
a list is paged by a cursor and the audit trail's state is wanted elsewhere, a list needs sorting or
selection (a table, ADR 0054), or the screen's gate or the test providers are copied to a third screen.
