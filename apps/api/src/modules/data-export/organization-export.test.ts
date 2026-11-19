import { ExportNotFoundException, ExportTooSoonException } from './data-export.errors'
import { assertCanRequest, downloadable, newExport, readied, stateOf } from './organization-export'

const at = (iso: string) => new Date(iso)
const requested = newExport({
  id: 'export-1',
  organizationId: 'org-1',
  requestedBy: 'user-ada',
  now: at('2026-11-19T12:00:00Z')
})
const ready = readied(requested, { now: at('2026-11-19T12:00:05Z'), size: 2048 })

describe('an organization export (ADR 0074)', () => {
  it('starts pending, asked by an owner now', () => {
    expect(requested).toEqual({
      id: 'export-1',
      organizationId: 'org-1',
      requestedBy: 'user-ada',
      requestedAt: at('2026-11-19T12:00:00Z'),
      readyAt: null,
      expiresAt: null,
      size: null
    })
  })

  it('is ready with its size, and expires 7 days later', () => {
    expect(ready).toMatchObject({
      readyAt: at('2026-11-19T12:00:05Z'),
      expiresAt: at('2026-11-26T12:00:05Z'),
      size: 2048
    })
  })

  describe('asking again', () => {
    it('is open when none was asked for, or the last was asked 15 minutes ago', () => {
      expect(() => assertCanRequest(null, at('2026-11-19T12:00:00Z'))).not.toThrow()
      expect(() => assertCanRequest(requested, at('2026-11-19T12:15:00Z'))).not.toThrow()
    })

    it('is refused sooner, whether the last one is pending or ready', () => {
      expect(() => assertCanRequest(requested, at('2026-11-19T12:14:59Z'))).toThrow(ExportTooSoonException)
      expect(() => assertCanRequest(ready, at('2026-11-19T12:10:00Z'))).toThrow(ExportTooSoonException)
    })
  })

  describe('its state, as the page reads it', () => {
    it('is none before any request', () => {
      expect(stateOf(null, at('2026-11-19T12:00:00Z'))).toEqual({ status: 'none' })
    })

    it('is pending, with when the owner may ask again', () => {
      expect(stateOf(requested, at('2026-11-19T12:01:00Z'))).toEqual({
        status: 'pending',
        requestedAt: '2026-11-19T12:00:00.000Z',
        nextRequestAt: '2026-11-19T12:15:00.000Z'
      })
    })

    it('says the owner may ask now once 15 minutes passed', () => {
      expect(stateOf(requested, at('2026-11-19T12:20:00Z'))).toMatchObject({ status: 'pending', nextRequestAt: null })
    })

    it('is ready until it expires, with its size', () => {
      expect(stateOf(ready, at('2026-11-20T08:00:00Z'))).toEqual({
        status: 'ready',
        requestedAt: '2026-11-19T12:00:00.000Z',
        expiresAt: '2026-11-26T12:00:05.000Z',
        size: 2048,
        nextRequestAt: null
      })
    })

    it('is expired from its expiry on', () => {
      expect(stateOf(ready, at('2026-11-26T12:00:05Z'))).toEqual({
        status: 'expired',
        requestedAt: '2026-11-19T12:00:00.000Z',
        expiresAt: '2026-11-26T12:00:05.000Z',
        nextRequestAt: null
      })
    })
  })

  describe('downloading', () => {
    it('is open while it is ready', () => {
      expect(downloadable(ready, at('2026-11-26T12:00:04Z'))).toBe(ready)
    })

    it.each([
      ['none was asked for', null, '2026-11-19T12:00:00Z'],
      ['it is still pending', requested, '2026-11-19T12:00:01Z'],
      ['it expired', ready, '2026-11-26T12:00:05Z']
    ])('is refused when %s', (_case, record, now) => {
      expect(() => downloadable(record, at(now))).toThrow(ExportNotFoundException)
    })
  })
})
