/**
 * Each screen draws its own shell, so the phone drawer closes when the screen changes. Going to the
 * settings from the account menu is the one change that should leave it open: the settings have a menu
 * of their own, and the user who asked for them is likely to want another screen than the first. The
 * drawer that is leaving says so, and the shell of the next screen takes it up once.
 */
let pending = false

/** Asks the next screen's shell to open its drawer. */
export const keepDrawerOpenOnNextScreen = () => {
  pending = true
}

/** Whether the previous screen's drawer asked to stay open; reading it uses the request up. */
export const takeDrawerHandoff = (): boolean => {
  const asked = pending
  pending = false
  return asked
}
