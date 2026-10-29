import type { EmailMessage } from '#libs/ports/email-sender.port'
import { type EmailKind, emailTexts, type Locale } from './email-texts'

const HTML_ESCAPES: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }

/** Text made safe for HTML content and attribute values. */
const escapeHtml = (value: string): string => value.replace(/[&<>"']/g, (char) => HTML_ESCAPES[char] as string)

/**
 * An identity email in the user's language (ADR 0021): a paragraph, one link and a footer, as
 * plain text and as HTML. The link is escaped, since it carries a query string.
 */
export function writeEmail(
  kind: EmailKind,
  { to, locale, url }: { to: string; locale: Locale; url: string }
): EmailMessage {
  const { subject, body, action, footer } = emailTexts[locale][kind]
  const html = `<!doctype html>
<html lang="${locale}">
  <head><meta charset="utf-8"></head>
  <body style="font-family: system-ui, sans-serif; line-height: 1.5">
    <p>${escapeHtml(body)}</p>
    <p><a href="${escapeHtml(url)}">${escapeHtml(action)}</a></p>
    <p>${escapeHtml(footer)}</p>
  </body>
</html>
`
  return { to, subject, text: `${body}\n\n${action}: ${url}\n\n${footer}\n`, html }
}
