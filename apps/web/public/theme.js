// The theme chosen on this device, on <html> before the first paint, so it never flashes the other
// one (ADR 0028). It mirrors ThemeProvider in src/shared/config/theme; theme-script.test.ts runs it.
try {
  const theme = localStorage.getItem('theme')
  if (theme === 'light' || theme === 'dark') document.documentElement.dataset.theme = theme
} catch {
  // Storage is blocked: the system's theme applies.
}
