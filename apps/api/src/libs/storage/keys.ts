/**
 * The only place a key of the file store is built (ADR 0076): its kind, the organization, then an id the
 * server generated. The kind comes first so a lifecycle rule can name it (`uploads/` goes after a day), the
 * organization second so its files are three prefixes. No key holds anything a user typed.
 */
const KINDS = ['uploads', 'logos', 'exports'] as const

/** `<kind>/<id>/<id>[.ext]`, ids of letters, digits, `-` and `_`: nothing a path could climb out of. */
const KEY = /^(uploads|logos|exports)\/[\w-]+\/[\w-]+(\.[a-z]+)?$/

export const isKey = (key: string) => KEY.test(key)

function key(value: string): string {
  if (!isKey(value)) throw new Error('Invalid file key')
  return value
}

/** Where the browser puts a file before the API checks it: deleted after a day if never confirmed. */
export const uploadKey = (organizationId: string, uploadId: string) => key(`uploads/${organizationId}/${uploadId}`)

/** An organization's logo, written by the API once checked; a new logo has a new id. */
export const logoKey = (organizationId: string, logoId: string) => key(`logos/${organizationId}/${logoId}`)

/** An organization's export (ADR 0074), by the export's id. */
export const exportKey = (organizationId: string, exportId: string) => key(`exports/${organizationId}/${exportId}.zip`)

/** Everything of an organization in the store, which goes with it. */
export const organizationPrefixes = (organizationId: string) => KINDS.map((kind) => `${kind}/${organizationId}/`)
