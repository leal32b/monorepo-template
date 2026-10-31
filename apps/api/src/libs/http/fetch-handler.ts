import type { IncomingMessage } from 'node:http'
import { readBody } from './body'
import type { HttpHandler } from './router'

/** Methods whose requests carry no body. */
const BODILESS = new Set(['GET', 'HEAD'])

/** The request's headers as they came, repeated ones included. */
function toHeaders(req: IncomingMessage): Headers {
  const headers = new Headers()
  const raw = req.rawHeaders // name, value, name, value, ...
  for (let i = 0; i < raw.length; i += 2) headers.append(raw[i] as string, raw[i + 1] as string)
  return headers
}

/**
 * Serves a handler written for the Fetch API (`Request` in, `Response` out), such as Better Auth's,
 * on `node:http`. The body is read here, under our size limit, before the handler sees it. The URL
 * is rebuilt on `origin`, the origin the browser used.
 */
export function fromFetchHandler(handle: (request: Request) => Promise<Response>, origin: string): HttpHandler {
  return async (req, res) => {
    const method = req.method as string
    const body = BODILESS.has(method) ? null : await readBody(req)
    const request = new Request(new URL(req.url as string, origin), { method, headers: toHeaders(req), body })
    const response = await handle(request)
    res.statusCode = response.status
    for (const [name, value] of response.headers) if (name !== 'set-cookie') res.setHeader(name, value)
    const cookies = response.headers.getSetCookie()
    if (cookies.length > 0) res.setHeader('Set-Cookie', cookies)
    res.end(Buffer.from(await response.arrayBuffer()))
  }
}
