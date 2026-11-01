# 0028. Keep the theme and the language on the device

- Status: accepted
- Date: 2026-11-01

## Context and problem statement

[ADR 0016](0016-design-system-on-kobalte-and-unocss.md) made dark mode follow the system only, and
the language comes from the browser's list ([ADR 0011](0011-typed-i18n-dictionaries.md)). The
Preferences screen of the [app shell plan](../design/app-shell-plan.md) lets the user pick a theme
(System, Light, Dark) and one of the three languages. Where is the choice kept, and how is it in
place before the first paint, so a dark choice never flashes light?

## Decision drivers

- No flash: the chosen theme is on the page before the browser paints anything.
- The CSP allows no inline script (`script-src 'self'`, `apps/web/public/_headers`).
- Works before sign-in (entry screens) and without a call to the API.
- "System" keeps following the device, live, as it does today.
- Small, and nothing breaks when storage is blocked (private windows, strict settings).

## Considered options

1. `localStorage`, applied by a small blocking script file in `<head>`, as `data-theme` on `<html>`.
2. The same, as an inline script allowed by a CSP hash.
3. A cookie the web Worker reads, writing `data-theme` into `index.html` as it serves it.
4. On the account, in the API.

## Decision outcome

Chosen option 1.

- **Theme.** `localStorage.theme` holds `light` or `dark`; "System" is no key. `public/theme.js`, a
  classic script in `<head>` before the app's module, sets `data-theme` on `<html>` from it, so
  the attribute is there before the first paint. The app's `ThemeProvider` (`shared/config`) reads
  the same key, sets the attribute when it changes, and stores the choice. A test runs
  `theme.js` to hold the two to the same key and values.
- **The preset** declares the light roles on `:root`, the dark ones on `[data-theme=dark]`, and the
  dark ones under `prefers-color-scheme: dark` unless the choice is `light`. `color-scheme`
  follows, so scrollbars and native controls match.
- **Language.** `localStorage.locale` holds the chosen locale; the entry reads it before the
  browser's list and loads that dictionary before rendering, as today. `setLocale` stores it.
- Reading and writing storage never throws: when it is blocked, the choice lasts until the tab
  closes and the device's own preference applies again.

Option 2 was rejected: the hash must change with every edit of the script, and a mistake fails
silently in production only. Option 3 puts the Worker on the path of every page load for a
preference, and the Worker today only proxies the API. Option 4 needs a session before the first
paint, does not cover the entry screens, and a theme is often a choice per device.

### Consequences

- Good: no flash for any choice, no inline script, no API call, works signed out.
- Good: "System" still follows the device live, by CSS alone.
- Bad: one extra request, small and blocking, before the app's module on each first load.
- Bad: the choice is per browser: another device, or cleared site data, starts from the system
  again. Two open tabs agree only after a reload.
- Bad: emails keep the language given at sign-up, which the device choice does not change; the
  Preferences screen says so.

## Revisit when

Users ask for their preferences to follow them across devices (store them on the account and
apply them after sign-in), emails should follow the chosen language, or the CSP gains a nonce
that makes an inline script as cheap as the file.
