import '@testing-library/jest-dom/vitest'
import { loadMessages, locales } from './shared/config/i18n/messages'

// The app loads the user's language before it renders; the screens' tests render at once, so they start loaded.
await Promise.all(locales.map(loadMessages))
