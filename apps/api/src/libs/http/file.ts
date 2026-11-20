import type { ServerResponse } from 'node:http'

/**
 * A file a use case hands out at the store's signed address (ADR 0076): `tenantRoutes` answers it with a
 * `302` that no browser or proxy keeps, so the address is asked for again, behind the guard, every time.
 */
export class FileRedirect {
  constructor(readonly location: string) {}
}

export function sendRedirect(res: ServerResponse, file: FileRedirect): void {
  res.writeHead(302, { Location: file.location, 'Cache-Control': 'no-store' })
  res.end()
}
