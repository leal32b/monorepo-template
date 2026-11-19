import { defineEmails, type EmailOf } from '#libs/notifications/define-emails'
import { formatDay } from '#libs/notifications/format'
import type { DirectoryRead } from '../organization-directory.port'
import { en } from './locales/en'
import { es } from './locales/es'
import { ptBR } from './locales/pt-BR'

/** The export's email (ADR 0074), on its own job kind (ADR 0073); its link opens a page behind the session, so it is no credential. */
export const dataExportEmails = defineEmails('data-export.send-email', { en, es, 'pt-BR': ptBR })

type DataExportEmail = EmailOf<Parameters<typeof dataExportEmails.write>[0]['email']>

/** The export is ready until `expiresAt`, said as a day in the organization's calendar; the button opens its settings. */
export function exportReadyEmail(
  requester: NonNullable<DirectoryRead['requester']>,
  organization: DirectoryRead['organization'],
  expiresAt: Date,
  webOrigin: string
): DataExportEmail {
  const { email, locale } = requester
  return {
    email: 'exportReady',
    to: email,
    locale,
    url: `${webOrigin}/${organization.slug}/settings/general`,
    values: {
      organization: organization.name,
      expires: formatDay(expiresAt, { locale, timeZone: organization.timeZone })
    }
  }
}
