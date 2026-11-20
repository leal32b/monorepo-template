import { readStored, store } from '#shared/config'

const KEY = 'impersonation'

/**
 * Keeps on this device that an operator entered an organization here (ADR 0077), as the session's hint does
 * (ADR 0042): only that. The app asks the back office which visit is on only where this was kept, so no other
 * user's console shows the back office's 404.
 */
export function rememberImpersonation(): void {
  store(KEY, 'on')
}

export function forgetImpersonation(): void {
  store(KEY, undefined)
}

export function hasImpersonation(): boolean {
  return readStored(KEY) === 'on'
}
