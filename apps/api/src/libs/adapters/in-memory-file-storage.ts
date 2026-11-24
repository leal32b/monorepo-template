import type { FileStorage, SignedUpload, StoredFile } from '#libs/ports/file-storage.port'

type Kept = { content: Buffer; type: string; cacheControl: string | undefined }

/**
 * The file store for use-case tests (ADR 0076): files in a map, addresses that say what they grant. A test
 * puts what a browser would upload with `write`, and reads `files` to see what a use case kept.
 */
export class InMemoryFileStorage implements FileStorage {
  readonly files = new Map<string, Kept>()

  async signUpload(
    key: string,
    { type, size, expiresInSeconds }: StoredFile & { expiresInSeconds: number }
  ): Promise<SignedUpload> {
    const expiresAt = new Date(Date.UTC(2000, 0, 1) + expiresInSeconds * 1000)
    return {
      url: `memory://${key}?type=${type}&size=${size}`,
      method: 'PUT',
      headers: { 'Content-Type': type },
      expiresAt
    }
  }

  async signDownload(
    key: string,
    { signedAt, expiresInSeconds, fileName }: { signedAt: Date; expiresInSeconds: number; fileName?: string }
  ): Promise<string> {
    const name = fileName === undefined ? '' : `&name=${fileName}`
    return `memory://${key}?signedAt=${signedAt.toISOString()}&expires=${expiresInSeconds}${name}`
  }

  async stat(key: string): Promise<StoredFile | null> {
    const file = this.files.get(key)
    return file === undefined ? null : { size: file.content.length, type: file.type }
  }

  async read(key: string): Promise<Buffer | null> {
    return this.files.get(key)?.content ?? null
  }

  async write(key: string, content: Buffer, { type, cacheControl }: { type: string; cacheControl?: string }) {
    this.files.set(key, { content, type, cacheControl })
  }

  async delete(key: string): Promise<void> {
    this.files.delete(key)
  }

  async deletePrefix(prefix: string): Promise<number> {
    const keys = [...this.files.keys()].filter((key) => key.startsWith(prefix))
    for (const key of keys) this.files.delete(key)
    return keys.length
  }
}
