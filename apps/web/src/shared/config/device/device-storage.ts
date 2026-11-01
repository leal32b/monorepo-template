/**
 * A value kept in this browser (`localStorage`), for preferences of the device such as the theme
 * (ADR 0028). Storage can be blocked or full: then reading finds nothing and writing keeps nothing,
 * and neither throws.
 */
export function readStored(key: string): string | null {
  try {
    return window.localStorage.getItem(key)
  } catch {
    return null
  }
}

/** Keeps `value` under `key`; `undefined` forgets it. */
export function store(key: string, value: string | undefined): void {
  try {
    if (value === undefined) window.localStorage.removeItem(key)
    else window.localStorage.setItem(key, value)
  } catch {
    // Nothing is kept: the choice lasts until the page closes.
  }
}
