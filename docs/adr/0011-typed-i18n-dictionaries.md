# 0011. Typed i18n dictionaries with @solid-primitives/i18n

- Status: accepted
- Date: 2026-10-24

## Context and problem statement

UI text must be translatable (English and Brazilian Portuguese to begin with), and adding strings
or languages later must stay cheap. Which approach?

## Decision drivers

- A missing translation must be caught before runtime.
- Small and reactive; no heavy runtime.
- Dates, numbers and currencies without extra libraries.

## Considered options

1. i18next (+ solid bindings), JSON files, a parity script.
2. `@solid-primitives/i18n` with TypeScript dictionaries.
3. Hand-rolled `t()` over a record.

## Decision outcome

Chosen option 2.

- One TypeScript file per language in `shared/config/i18n/locales/`. English is the source:
  `Messages = typeof en`, and every other language is typed as `Messages`, so a missing or extra
  key fails `pnpm typecheck`. `messages.ts` is the registry; `Locale` is derived from it.
- A test also compares flattened keys and `{{placeholders}}` across languages (what types
  cannot see) and rejects empty text.
- `t('apiStatus.up', { service })` has typed keys and is reactive; the language can change at
  runtime with `setLocale`.
- The initial language comes from `navigator.languages` (`detectLocale`, pure and tested); the
  provider keeps `<html lang>` in sync.
- Dates and numbers use `Intl`; nothing to install.

### Consequences

- Good: no parity script; compile-time safety and autocompleted keys.
- Bad: translators edit `.ts` files rather than JSON; plural rules are written by hand or with
  `Intl.PluralRules`.

## Revisit when

Translators need a dedicated tool, or the dictionaries grow large enough to split per feature
and load lazily.
