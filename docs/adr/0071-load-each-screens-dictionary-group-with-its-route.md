# 0071. Load each screen's dictionary group with its route

- Status: accepted
- Date: 2026-11-18

Supersedes the **loading** part of [ADR 0058](0058-split-the-i18n-dictionaries-by-slice-and-merge-them-per-language.md)
(one chunk per language, which its option 4 rejected "for now"). Its layout, its per-slice files, its merge types
and its tests stay.

## Context and problem statement

[ADR 0058](0058-split-the-i18n-dictionaries-by-slice-and-merge-them-per-language.md) split the texts by slice but
kept one chunk per language, so every first download carried every screen's words: the sign-in screen paid for the
billing page's texts. It named the signal to reopen that: a language chunk past about 15 KB gzipped, or the sign-in
budget with less than 2 KB of room. The billing work has spent the room twice ([ADR 0068](0068-say-the-subscription-once-per-screen-and-open-the-plan-page-to-every-member.md)
raised each JavaScript budget by 1 KB and recorded that the signal had fired;
[ADR 0069](0069-build-the-asaas-adapter-customer-first-and-read-a-scheduled-end-again-on-its-date.md) raised the
sign-in and public-page budgets again). How does the first download stop carrying texts it does not draw, without a
screen ever drawing a key or moving when its words arrive?

## Decision drivers

- The budgets of [ADR 0045](0045-run-the-end-to-end-suite-on-the-built-app-without-outside-services.md) get real room.
- A screen never draws untranslated text, and nothing shifts when its words arrive: the screen swaps at once and
  waits with its skeleton ([ADR 0038](0038-load-screen-data-through-router-queries-and-swap-screens-at-once.md)).
- `t('group.key')` keeps its call sites and stays exactly typed ([ADR 0011](0011-typed-i18n-dictionaries.md)).
- Every language keeps the full set of keys, checked as before.
- The language still changes without a reload, and a failed fetch is said, not hidden.
- As little machinery as the saving justifies; a visit after the first pays nothing.

## Considered options

1. Keep one chunk per language and raise the budgets again: no work, and the first download keeps growing with
   every screen.
2. Lazy groups, loaded by each screen's code when it renders (`await` inside a `lazy` import): the text and the code
   arrive together, but a failed text fetch is a failed chunk, which has no retry, and the fetch starts only when the
   screen is rendered, after its reads.
3. Lazy groups per language, named by the route, started by the route's `preload` beside its reads, and awaited by a
   gate in front of the screen under the same skeleton and failure boundary as its reads.
4. Texts fetched from the API per screen: a request and a cache for what is static; rejected on sight.

## Decision outcome

Chosen option: "3", because it starts the fetch as early as option 2 can only dream of, keeps the failure and
retry path of every other read, and changes no `t(...)` call site.

- **What stays in the first download (the core).** `shell` (the frame, the shared words, the not-found page,
  the session and failure texts, and `confirmPassword`, the words of a shared form) and `entry` (the visitor's
  screens, their layout, mail provider names). They are merged by `locales/<language>.ts`, which is still one
  chunk per language fetched before the first render ([ADR 0028](0028-keep-theme-and-language-on-the-device.md)),
  so the entry screens, the error screens and the skeletons never wait for words.
- **What loads with its route.** Every other group is a file per language, fetched with `import.meta.glob`:
  `account`, `audit`, `billing`, `customers`, `organizations`, `public` and `team`. Two groups were cut to match
  the screens: `organizations` now holds only the `organizations` key, which every signed-in screen's provider and
  guard draw, and the rest of the old group moved to `team` (general, members, roles, invitations, onboarding).
  `confirmPassword` moved to `shell`, because a form in `shared/ui` draws it. The key names did not change, so no
  call site did.
- **How.** `screenOf(Page, groups, reads?)` in `app/screen.tsx` returns the route's `component` and `preload`. The
  `preload` calls `loadGroups(groups)` and then the screen's reads, so a text fetch starts as the router opens the
  route, in parallel with the screen's code and its data. It starts for a link only hovered, too: words are code,
  not data, and the reads keep ignoring a hover on their own ([ADR 0040](0040-start-a-screens-reads-when-it-opens-not-on-hover.md)).
  The component wraps the screen in `WithTexts`: with the groups there it draws at once, as on every visit after the
  first; otherwise it reads the fetch under the nearest `Suspense`, the one that already holds the page on view or
  draws the skeleton for a screen's code, and draws the screen only after. Layout routes use it too: the
  organizations provider names `organizations`, the app frame names `billing` (its subscription notice appears on
  any screen), so what draws on every signed-in screen is never missing.
- **Types stay exact.** `Messages` is the intersection of the core merge and the type of every lazy group, built
  from `import type` of the group files, so `t('billing.title')` is checked as before and nothing of a lazy group
  enters the first chunk. Each language file is typed `typeof <group>En`, so a key missing in a language still
  fails the typecheck in that file.
- **A group is a folder.** `dictionaries.test.ts` checks that `coreGroups` and `lazyGroups` (in `messages.ts`) name
  exactly the folders of `dictionaries/`, that each has the three languages with the same keys, that no key is in two
  groups, and that the core merge holds the core groups unchanged. `messages.test.ts` runs its parity, placeholder and
  empty-text checks over the language with every group loaded.
- **When the language changes.** `loadMessages(next)` fetches the language's file and every group any screen has
  asked for so far, and only then does the screen switch: no text is ever missing for the new language, and no
  reload is needed. A screen opened after it loads its groups for every language that is loaded.
- **When the fetch fails.** `loadGroups` throws and keeps nothing of the failure. The gate sits in the same
  `ReadFailure` as the screen's reads: an alert in the shell's own words (`failure.texts`, in the core) with
  "Try again", which draws the gate anew and fetches again; an expired session still goes to the sign-in. The
  alternative, falling back to the core's English or to the keys, would show a screen that looks done and is
  wrong; a screen that cannot be read says so.
- **A safety net, not a design.** `t` returns the key and logs `[i18n] "<key>" has no text: …` when a text is not
  loaded, which only happens when a route misses a group its screen uses. The end-to-end `page` fixture fails any
  test during which that line is logged, so a wrong route fails the suite instead of reaching a user.

### Results

The JavaScript a cold load fetches, gzipped, as `bundle-budget.spec.ts` measures it:

| Cold load | Before | After | Budget before | Budget after |
| --- | --- | --- | --- | --- |
| Sign-in | 79 KB | 72 KB | 79 KB | 73 KB |
| First signed-in screen | 118 KB | 114 KB | 118 KB | 115 KB |
| A tenant's public page | 82 KB | 75 KB | 82 KB | 76 KB |

The budgets are the new measure plus 1 KB, the margin the earlier lowerings kept for rounding ([ADR 0045](0045-run-the-end-to-end-suite-on-the-built-app-without-outside-services.md)).

### Consequences

- Good: the first download carries two groups, not nine; a new module's texts cost nobody who does not open it.
- Good: a visit after the first draws as before, with no wait; a first visit to a screen waits for its words in
  parallel with its code and data, under the skeleton that already covers them.
- Good: `t(...)` call sites, key names and the typing did not change.
- Bad: a screen must name the groups it uses; a missing one is caught only where a test opens the screen (the
  end-to-end suite does for the screens it walks), not by the compiler.
- Bad: a new module adds three edits instead of two: its name in `lazyGroups`, its type in `Messages`, and the
  groups in its routes.
- Bad: the `billing` group is still on every signed-in screen, because the frame's notice and the plan refusals
  draw its keys; splitting those few keys into a group of their own would save about 2 KB more and is left until a
  budget asks for it.
- Bad: a language chosen later loads each group asked for so far for that language: one small request per group,
  once.

## Revisit when

A signed-in screen's first load waits visibly for its words (measure it with the slow network profile), or
the `billing` group on the frame costs the signed-in budget more than 2 KB of its room.
