import type { ServerResponse } from 'node:http'

/**
 * A file a use case hands back to download (ADR 0074): `tenantRoutes` answers it as an attachment, with its
 * name and type, that no browser or proxy keeps. Its bytes are in memory: a file too large for that waits
 * for the file store (P1-5), which answers with a signed address of its own.
 */
export class FileDownload {
  constructor(
    /** The name the browser saves it under: letters, digits, spaces, `.`, `-` and `_`. */
    readonly name: string,
    readonly type: string,
    readonly content: Buffer
  ) {}
}

export function sendFile(res: ServerResponse, file: FileDownload): void {
  res.writeHead(200, {
    'Content-Type': file.type,
    'Content-Length': file.content.length,
    'Content-Disposition': `attachment; filename="${file.name}"`,
    'Cache-Control': 'no-store'
  })
  res.end(file.content)
}
