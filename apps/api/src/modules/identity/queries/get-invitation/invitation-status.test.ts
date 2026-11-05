import { invitationStatus } from './invitation-status'

const now = new Date('2026-11-04T12:00:00.000Z')
const later = new Date('2026-11-11T12:00:00.000Z')

describe('invitationStatus', () => {
  it('is pending until its date, and expired from then on', () => {
    expect(invitationStatus('pending', later, now)).toBe('pending')
    expect(invitationStatus('pending', now, now)).toBe('expired')
  })

  it('names the plugin’s answers in the web’s words, whatever the date', () => {
    expect(invitationStatus('accepted', now, later)).toBe('accepted')
    expect(invitationStatus('rejected', later, now)).toBe('declined')
    expect(invitationStatus('canceled', later, now)).toBe('withdrawn')
  })

  it('reads a status it does not know as withdrawn', () => {
    expect(invitationStatus('archived', later, now)).toBe('withdrawn')
  })
})
