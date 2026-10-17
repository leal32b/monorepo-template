import type { IncomingMessage, ServerResponse } from 'node:http'
import { HttpProblem } from './problem'

export type RouteContext = {
  /** Path parameters, already percent-decoded. */
  params: Record<string, string>
  requestId: string
}

export type HttpHandler = (req: IncomingMessage, res: ServerResponse, ctx: RouteContext) => void | Promise<void>

type Route = {
  method: string
  pattern: string
  segments: string[]
  handler: HttpHandler
}

export type RouteMatch =
  | { kind: 'found'; pattern: string; handler: HttpHandler; params: Record<string, string> }
  | { kind: 'method-not-allowed'; pattern: string; allow: string[] }
  | { kind: 'not-found' }

const splitPath = (path: string): string[] => path.split('/').filter(Boolean)

function decode(segment: string): string {
  try {
    return decodeURIComponent(segment)
  } catch {
    throw new HttpProblem(400, 'invalid_path', {
      detail: 'Malformed percent-encoding in the path.'
    })
  }
}

/** Raw (still encoded) parameters when the path fits the pattern, otherwise `null`. */
function matchSegments(pattern: string[], parts: string[]): Record<string, string> | null {
  const params: Record<string, string> = {}
  for (const [i, segment] of pattern.entries()) {
    const part = parts[i]
    if (part === undefined) return null // the path is shorter than the pattern
    if (segment.startsWith(':')) params[segment.slice(1)] = part
    else if (segment !== part) return null
  }
  return parts.length === pattern.length ? params : null // longer paths do not match
}

export class HttpRouter {
  readonly #routes: Route[] = []

  on(method: string, pattern: string, handler: HttpHandler): void {
    this.#routes.push({ method: method.toUpperCase(), pattern, segments: splitPath(pattern), handler })
  }

  get(pattern: string, handler: HttpHandler): void {
    this.on('GET', pattern, handler)
  }

  post(pattern: string, handler: HttpHandler): void {
    this.on('POST', pattern, handler)
  }

  put(pattern: string, handler: HttpHandler): void {
    this.on('PUT', pattern, handler)
  }

  delete(pattern: string, handler: HttpHandler): void {
    this.on('DELETE', pattern, handler)
  }

  /** Resolves a request line. Throws a 400 problem on malformed percent-encoding. */
  match(method: string, pathname: string): RouteMatch {
    const parts = splitPath(pathname)
    const allow: string[] = []
    let pattern = ''
    for (const route of this.#routes) {
      const raw = matchSegments(route.segments, parts)
      if (!raw) continue
      if (route.method !== method) {
        pattern = route.pattern
        allow.push(route.method)
        continue
      }
      const params = Object.fromEntries(Object.entries(raw).map(([key, value]) => [key, decode(value)]))
      return { kind: 'found', pattern: route.pattern, handler: route.handler, params }
    }
    if (allow.length === 0) return { kind: 'not-found' }
    return { kind: 'method-not-allowed', pattern, allow }
  }
}
