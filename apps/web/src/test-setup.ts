import '@testing-library/jest-dom/vitest'
import { loadMessages, locales } from './shared/config/i18n/messages'

// The app loads the user's language before it renders; the screens' tests render at once, so they start loaded.
await Promise.all(locales.map(loadMessages))

// Kobalte's modal layers mark the body (`aria-hidden`, `pointer-events: none`) and take it off when
// their exit animation ends, which never happens in happy-dom. Clear it so a test starts clean.
afterEach(() => {
  document.body.removeAttribute('aria-hidden')
  document.body.removeAttribute('style')
})
