import '@testing-library/jest-dom/vitest'

// Kobalte's modal layers mark the body (`aria-hidden`, `pointer-events: none`) and take it off when
// their exit animation ends, which never happens in happy-dom. Clear it so a test starts clean.
afterEach(() => {
  document.body.removeAttribute('aria-hidden')
  document.body.removeAttribute('style')
})
