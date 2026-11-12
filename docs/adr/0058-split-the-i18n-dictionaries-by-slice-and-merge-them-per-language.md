# 0058. Split the i18n dictionaries by slice and merge them per language

- Status: accepted
- Date: 2026-11-11
- Amends: [0011](0011-typed-i18n-dictionaries.md)

## Context and problem statement

[ADR 0011](0011-typed-i18n-dictionaries.md) put each language in one file, `locales/en.ts`, `es.ts` and
`pt-BR.ts`, about 800 lines each, and said to revisit "when the dictionaries grow large enough to split per
feature". Every screen a product adds edits the same three files, so they grow to thousands of lines and two
modules built in parallel collide on them. How are the texts split so that two modules never edit the same
file, while keys stay typed and the first download does not grow?

## Decision drivers

- A missing key in one language stays a compile error ([ADR 0011](0011-typed-i18n-dictionaries.md)).
- Two modules built in parallel do not edit the same file.
- FSD holds: `shared` imports nothing from the layers above it ([ADR 0010](0010-web-architecture-feature-sliced-design.md)).
- No flash of untranslated text and no layout shift: screens swap at once and wait with a skeleton
  ([ADR 0038](0038-load-screen-data-through-router-queries-and-swap-screens-at-once.md)), and the language is
  loaded before the first paint ([ADR 0028](0028-keep-the-theme-and-the-language-on-the-device.md)).
- The first download of a visitor does not grow; the bundle budget test keeps its limits.
- Changing the language still works without a reload.
- As little machinery as the size justifies: today a language is about 7 to 8 KB gzipped.

## Considered options

1. Keep three files and tell people to add carefully: no work, and the collisions stay.
2. Dictionaries beside each slice (`pages/customers/i18n/en.ts`), merged in `app/`. A slice exposes only its
   `index.ts`, so the merge would import every slice's public API and pull its components into the first
   download, or the slices would need a second public file Steiger rejects. A text is also used by several
   slices (the customers page, its feature, the shell), so "beside the slice" has no single slice to sit in.
   The type of `t` lives in `shared`, which cannot see the merge in `app/`; it would need module augmentation.
3. One file per slice and language in `shared/config/i18n/dictionaries/<group>/<language>.ts`, merged by
   `locales/<language>.ts` into one chunk per language, as today.
4. Option 3, and also load each group lazily with its slice's code (a chunk per group and language).

## Decision outcome

Chosen option: "3", because it reaches the goal, small files that do not collide, with the types and the
loading we already have and no new mechanism.

- **Layout.** `dictionaries/<group>/en.ts` exports `<group>En`; `es.ts` and `pt-BR.ts` export `<group>Es`
  and `<group>PtBR`, typed `typeof <group>En`. A group holds the top-level keys of one area: `entry` (the
  entry screens), `account` (profile, preferences, security and deletion), `organizations`, `customers`,
  `shell` (the frame, the home page, the shared words, the not-found page). A new module adds a group; it does
  not edit another module's.
- **Merge.** `locales/<language>.ts` is only the merge: it spreads its groups, and `Messages` stays
  `typeof en`. The merge is in `shared`, so no layer is imported upwards. A missing or extra key in a group file
  of another language fails `pnpm typecheck` in that file, as before; a group missing from the merge makes its
  keys absent from the type, so screens that use them fail to compile.
- **Tests.** `dictionaries.test.ts` reads the group files and checks that each has the three languages with
  the same keys, that no key is written in two groups (a spread would let the last win without a sound), and
  that the merge holds every group unchanged. The parity, placeholder and empty-text tests of `messages.test.ts`
  keep running over the merged result.
- **Loading.** Unchanged: one dynamic import per language, awaited before the first render and before a
  language change. Because the groups are static imports of that file, a language is still one chunk, so the
  texts are there when a screen paints, nothing waits on a second download, and switching language needs no
  reload.
- **Cost of a new module.** A new group adds one import and one spread line to each of the three locale files.
  That is the single place two modules still touch the same file, and a conflict there is two adjacent lines.

Option 4 was rejected for now. It would split the language chunk into `entry` and `signed-in` parts, and the
sign-in screen would save about 1.5 to 2 KB gzipped. In exchange the provider must know which groups a route
needs, load them before the screen swaps (or the skeleton must wait for them as well as for the data), load
the groups already seen again when the language changes, and keep a missing group from rendering as keys.
That is a loader per route and a second failure mode for a saving smaller than the sign-in screen's own
variance; the budget has room. Option 2 was rejected for the FSD reasons above.

### Consequences

- Good: no file holds all the texts; the customers texts are one file per language, about 80 lines.
- Good: keys stay typed, a missing one still fails the typecheck, and nothing about loading changes, so the
  first download and the language chunk sizes are the same.
- Good: removing a language, or a whole module's texts, is deleting files and one line each.
- Bad: three locale files still list every group, and a new group edits them.
- Bad: the texts of a slice are in `shared`, not beside the slice's code.

## Revisit when

A language chunk passes about 15 KB gzipped, or the sign-in budget has less than 2 KB of room: then load the
signed-in groups with the routes behind the session (option 4), with the loading described above.
