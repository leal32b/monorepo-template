import { defineEmails } from '#libs/notifications/define-emails'
import { en } from './locales/en'
import { es } from './locales/es'
import { ptBR } from './locales/pt-BR'

/**
 * Identity's emails (ADR 0057, ADR 0073), on their own job kind. Their links are credentials, so a
 * job's payload is forgotten when it ends. Adding a language is a new file in `locales/` plus a line here.
 */
export const identityEmails = defineEmails('identity.send-email', { en, es, 'pt-BR': ptBR }, { secretPayload: true })
