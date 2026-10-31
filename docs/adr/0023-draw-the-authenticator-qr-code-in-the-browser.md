# 0023. Draw the authenticator QR code in the browser

- Status: accepted
- Date: 2026-10-31

## Context and problem statement

Turning on two-step verification ([ADR 0020](0020-authenticate-with-better-auth.md)) adds the account
to an authenticator app. Better Auth answers the password with an `otpauth://` URI that holds the
TOTP secret, and with the backup codes.

The user needs that URI in their app:

- on a computer, they scan a QR code with the phone;
- on the phone itself, they cannot scan their own screen, so a link opens the app;
- some apps take only the key, typed by hand.

The secret is as sensitive as a password: whoever holds it can produce the codes. How does the web
turn the URI into a QR code?

## Decision drivers

- The secret goes nowhere but the user's screen: not to a third party, not to a log.
- No new API route and no change to Better Auth's answer.
- Small: the web bundle grows by a few kilobytes at most, with no transitive dependencies.
- It works under the web's Content Security Policy (`img-src 'self' data:`, no inline styles).
- It follows the design system: colours as roles, held to contrast, and sharp at any size.

## Considered options

1. Draw it in the browser with [lean-qr](https://github.com/davidje13/lean-qr), as an inline SVG.
2. Draw it in the browser with [`qrcode`](https://www.npmjs.com/package/qrcode), to a canvas or a
   data URL.
3. Draw it in the API and send an image with the answer.
4. Use a QR image service, such as a chart API, with the URI in the image's URL.
5. No QR code: only the link and the key to type.

## Decision outcome

Chosen option 1.

- `QrCode` in `@repo/ui` draws the code as one SVG path from lean-qr's `generate` and `toSvgPath`.
  The secret stays in the page's memory.
- It has the standard quiet zone of 4 modules. It is dark on light in both themes, from two roles,
  `qr` and `qr-foreground`, that the contrast test holds: not every scanner reads a light code on a
  dark ground.
- The SVG is a vector, so it stays sharp at any size; a size class sets how big it is.
- Next to it, the screen offers a link to the URI, for a phone, and the key in groups of four, for
  typing.

Why not the others:

- **Option 2.** It is several times larger, with dependencies of its own. A canvas needs extra work
  to be named for screen readers and to look sharp on dense screens.
- **Option 3.** It adds a route and an image library to the API, and changes Better Auth's answer,
  which we keep as it is.
- **Option 4.** It sends the secret to a third party, in a URL that gets logged and cached.
- **Option 5.** On a computer, the user would type a key of more than 50 characters into the phone; that is the step
  people give up on.

### Consequences

- Good: the secret never leaves the browser, and the QR code works offline and under the CSP.
- Good: about 8 KB of code, with no dependencies, and it follows the theme rules.
- Bad: one more dependency to keep up to date. Its version is in the pnpm catalog, and the weekly
  audit covers it.
- Bad: the colour of the code does not follow the theme; it stays light in dark mode, on purpose.

## Revisit when

- lean-qr stops being maintained, or a security advisory has no fix.
- Passkeys replace TOTP as the second step, and the QR code is no longer needed.
