import type { WebhookReceipt } from '@repo/contracts'
import type { Logger } from 'pino'
import { readBody } from '#libs/http/body'
import { sendJson } from '#libs/http/json'
import { HttpProblem } from '#libs/http/problem'
import type { HttpHandler } from '#libs/http/router'
import type { WebhookInbox } from '#libs/ports/webhook-inbox.port'
import { type WebhookNotice, type WebhookReader, WebhookRefused } from '#libs/ports/webhook-reader.port'

const receipt: WebhookReceipt = { received: true }

/**
 * The handler of `POST /api/webhooks/<provider>` (ADR 0063), the counterpart of `publicRoute` for a
 * caller that is a provider: no session, no slug. In order, it reads the raw body under the 1 MiB
 * limit, never parsed first, since a signature covers the bytes as sent; hands the bytes and the headers
 * to the provider's reader, which authenticates them before it parses anything (a refusal is
 * `401 webhook_unauthenticated`, with a warning naming the provider and the reason, never the body, and
 * nothing has reached the database); takes the notice into the inbox, which records its event id and
 * enqueues its job in one transaction; and answers 200 for a new notice, a repeat and a kind not used
 * alike, so the provider stops resending it. A database out of reach answers 503, and the provider tries
 * again.
 */
export function webhookRoute<Notice extends WebhookNotice>(
  reader: WebhookReader<Notice>,
  inbox: WebhookInbox<Notice>,
  logger: Logger
): HttpHandler {
  return async (req, res, { requestId }) => {
    const rawBody = await readBody(req)
    let notice: Notice | 'ignored'
    try {
      notice = await reader.readWebhook(rawBody, req.headers)
    } catch (error) {
      if (!(error instanceof WebhookRefused)) throw error
      logger.warn({ reqId: requestId, provider: reader.name, reason: error.reason }, 'webhook refused')
      throw new HttpProblem(401, 'webhook_unauthenticated', { detail: 'The notice could not be authenticated.' })
    }
    if (notice !== 'ignored') {
      const fresh = await inbox.receive(reader.name, notice)
      logger.info(
        { reqId: requestId, provider: reader.name, eventId: notice.eventId, repeat: !fresh },
        'webhook received'
      )
    }
    sendJson(res, 200, receipt)
  }
}
