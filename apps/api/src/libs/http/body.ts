import type { IncomingMessage } from 'node:http'
import type { z } from 'zod'
import { HttpProblem } from './problem'

/** Largest request body accepted, Fastify's default: our routes take forms, not files. */
export const BODY_LIMIT_BYTES = 1_048_576

const tooLarge = () =>
  new HttpProblem(413, 'payload_too_large', { detail: `Request bodies are limited to ${BODY_LIMIT_BYTES} bytes.` })

/** True when the request declares a body: a length above zero, or chunked transfer. */
function hasBody(req: IncomingMessage): boolean {
  const length = req.headers['content-length']
  return length === undefined ? req.headers['transfer-encoding'] !== undefined : Number(length) > 0
}

/**
 * Checks on the headers alone, before any handler (threat model T06 and T15). Only JSON is
 * accepted: the bodies a page of another site can send without a preflight (a form, a `text/plain`
 * fetch) never reach a handler. A declared length over the limit is refused unread.
 */
export function assertAcceptableBody(req: IncomingMessage): void {
  if (!hasBody(req)) return
  const mediaType = req.headers['content-type']?.split(';')[0]?.trim().toLowerCase()
  if (mediaType !== 'application/json') {
    throw new HttpProblem(415, 'unsupported_media_type', { detail: 'Request bodies must be application/json.' })
  }
  if (Number(req.headers['content-length']) > BODY_LIMIT_BYTES) throw tooLarge()
}

/** The raw body, refused as soon as it passes the limit: a chunked body declares no length. */
export async function readBody(req: IncomingMessage): Promise<Buffer> {
  const chunks: Buffer[] = []
  let size = 0
  for await (const chunk of req as AsyncIterable<Buffer>) {
    size += chunk.length
    if (size > BODY_LIMIT_BYTES) throw tooLarge()
    chunks.push(chunk)
  }
  return Buffer.concat(chunks)
}

async function readJson(req: IncomingMessage): Promise<unknown> {
  const text = (await readBody(req)).toString('utf8')
  if (text.trim() === '') return {} // no body: the schema names the missing fields
  try {
    return JSON.parse(text)
  } catch {
    throw new HttpProblem(400, 'invalid_json', { detail: 'The request body is not valid JSON.' })
  }
}

/**
 * The JSON body, checked against a schema from `@repo/contracts`. A mismatch is a 400 that lists
 * each invalid field; unknown fields are dropped, as Zod does.
 */
export async function readValidJson<Schema extends z.ZodType>(
  req: IncomingMessage,
  schema: Schema
): Promise<z.output<Schema>> {
  const result = schema.safeParse(await readJson(req))
  if (result.success) return result.data
  throw new HttpProblem(400, 'validation_failed', {
    detail: 'The request body does not match the expected shape.',
    errors: result.error.issues.map((issue) => ({ path: issue.path.map(String).join('.'), message: issue.message }))
  })
}
