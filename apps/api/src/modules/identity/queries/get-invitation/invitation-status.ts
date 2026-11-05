import type { InvitationStatus } from '@repo/contracts'

/** The plugin's statuses, in the web's words. */
const answered: Record<string, InvitationStatus> = {
  accepted: 'accepted',
  rejected: 'declined',
  canceled: 'withdrawn'
}

/**
 * What became of an invitation at `now`. The plugin keeps an expired invitation `pending`, so the
 * date decides; a status it might add later reads as `withdrawn`, which asks for a new invitation.
 */
export function invitationStatus(stored: string, expiresAt: Date, now: Date): InvitationStatus {
  if (stored === 'pending') return expiresAt > now ? 'pending' : 'expired'
  return answered[stored] ?? 'withdrawn'
}
