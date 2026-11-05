import type { EmailMessage } from '#libs/ports/email-sender.port'
import { type EmailKind, emailTexts, type Locale } from './email-texts'

const HTML_ESCAPES: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }

/** Text made safe for HTML content and attribute values. */
const escapeHtml = (value: string): string => value.replace(/[&<>"']/g, (char) => HTML_ESCAPES[char] as string)

/** `text` with each `{name}` replaced by `values[name]`; a name without a value stays as written. */
const fill = (text: string, values: Record<string, string>): string =>
  text.replace(/\{(\w+)\}/g, (token, name: string) => values[name] ?? token)

/**
 * An identity email in the user's language (ADR 0021): a paragraph, one link and a footer, as
 * plain text and as HTML. `values` fill the `{name}` tokens of the subject and the body, such as an
 * invitation's organization. The link and the values are escaped in the HTML.
 */
export function writeEmail(
  kind: EmailKind,
  {
    to,
    locale,
    url,
    values = {}
  }: { to: string; locale: Locale; url: string; values?: Record<string, string> | undefined }
): EmailMessage {
  const texts = emailTexts[locale][kind]
  const { action, footer } = texts
  const subject = fill(texts.subject, values)
  const body = fill(texts.body, values)
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
