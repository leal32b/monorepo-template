import { decodeCursor, encodeCursor } from './audit-cursor'

describe('the audit cursor (ADR 0061)', () => {
  const cursor = { at: new Date('2026-11-07T10:00:00.123Z'), id: 'e|1' }

  it('reads back what it wrote, opaque to the web', () => {
    const text = encodeCursor(cursor)

    expect(text).toMatch(/^[\w-]+$/)
    expect(decodeCursor(text)).toEqual(cursor)
  })

  it.each([
    ['not base64url', '***'],
    ['without a separator', Buffer.from('2026-11-07T10:00:00.000Z').toString('base64url')],
    ['with a date that is not one', Buffer.from('yesterday|e1').toString('base64url')],
    ['without an id', Buffer.from('2026-11-07T10:00:00.000Z|').toString('base64url')]
  ])('reads nothing from a text %s', (_case, text) => {
    expect(decodeCursor(text)).toBeNull()
  })
})
