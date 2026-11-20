/** What the browser sends to put a file in the store: one `PUT` to `url` with `headers`, before `expiresAt`. */
export type SignedUpload = {
  url: string
  method: 'PUT'
  /** To send as they are: the store checks the signed ones. */
  headers: Record<string, string>
  expiresAt: Date
}

/** What the store knows of a file without reading it. */
export type StoredFile = { size: number; type: string }

/**
 * Where files live (ADR 0076): an S3-compatible store deployed, a folder in development and tests. Every
 * operation takes a key built by `libs/storage/keys.ts`. The bytes of an upload or a download never cross the
 * API: it signs addresses the browser uses within their life.
 */
export interface FileStorage {
  /** An address that takes one `PUT` of exactly `size` bytes of `type` at `key`, for `expiresInSeconds`. */
  signUpload(key: string, file: StoredFile & { expiresInSeconds: number }): Promise<SignedUpload>
  /**
   * An address that reads `key` from `signedAt` until `expiresInSeconds` after it: the same instant gives the
   * same address, which a browser can cache. With `fileName`, the browser saves it as an attachment.
   */
  signDownload(key: string, options: { signedAt: Date; expiresInSeconds: number; fileName?: string }): Promise<string>
  /** Its size and type, or `null` when nothing is at `key`. */
  stat(key: string): Promise<StoredFile | null>
  /** Its bytes, or `null` when nothing is at `key`. */
  read(key: string): Promise<Buffer | null>
  /** Puts `content` at `key`, replacing what was there, served with `type` and, if given, `cacheControl`. */
  write(key: string, content: Buffer, options: { type: string; cacheControl?: string }): Promise<void>
  /** Removes `key`; nothing there is not an error, so a retry is harmless. */
  delete(key: string): Promise<void>
  /** Removes every key that starts with `prefix`, and says how many. */
  deletePrefix(prefix: string): Promise<number>
}
