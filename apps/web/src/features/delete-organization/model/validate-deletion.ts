import type { Checked } from '#shared/lib'

/** The typed name must be the organization's own, which makes the deletion a deliberate act (D7). */
export function validateDeletion(typed: string, name: string): Checked<Record<string, never>, { confirm: 'mismatch' }> {
  return typed.trim() === name ? { ok: true, values: {} } : { ok: false, problems: { confirm: 'mismatch' } }
}
