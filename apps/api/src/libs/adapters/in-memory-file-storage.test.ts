import { InMemoryFileStorage } from './in-memory-file-storage'

describe('InMemoryFileStorage (ADR 0076)', () => {
  it('keeps, reads, states and deletes files by key and by prefix', async () => {
    const storage = new InMemoryFileStorage()
    await storage.write('logos/org-1/a', Buffer.from('png'), { type: 'image/png', cacheControl: 'private' })
    await storage.write('logos/org-1/b', Buffer.from('jpg'), { type: 'image/jpeg' })
    await storage.write('logos/org-2/a', Buffer.from('png'), { type: 'image/png' })

    expect(await storage.stat('logos/org-1/a')).toEqual({ size: 3, type: 'image/png' })
    expect(await storage.read('logos/org-1/b')).toEqual(Buffer.from('jpg'))
    expect(storage.files.get('logos/org-1/a')?.cacheControl).toBe('private')
    await storage.delete('logos/org-1/a')
    expect(await storage.stat('logos/org-1/a')).toBeNull()
    expect(await storage.read('logos/org-1/a')).toBeNull()
    expect(await storage.deletePrefix('logos/org-1/')).toBe(1)
    expect([...storage.files.keys()]).toEqual(['logos/org-2/a'])
  })

  it('signs addresses that say what they grant', async () => {
    const storage = new InMemoryFileStorage()
    const signedAt = new Date('2026-11-20T00:00:00Z')

    expect(await storage.signUpload('uploads/org-1/u', { type: 'image/png', size: 3, expiresInSeconds: 300 })).toEqual({
      url: 'memory://uploads/org-1/u?type=image/png&size=3',
      method: 'PUT',
      headers: { 'Content-Type': 'image/png' },
      expiresAt: new Date('2000-01-01T00:05:00Z')
    })
    expect(await storage.signDownload('logos/org-1/a', { signedAt, expiresInSeconds: 60 })).toBe(
      'memory://logos/org-1/a?signedAt=2026-11-20T00:00:00.000Z&expires=60'
    )
    expect(
      await storage.signDownload('exports/org-1/e.zip', { signedAt, expiresInSeconds: 60, fileName: 'e.zip' })
    ).toBe('memory://exports/org-1/e.zip?signedAt=2026-11-20T00:00:00.000Z&expires=60&name=e.zip')
  })
})
