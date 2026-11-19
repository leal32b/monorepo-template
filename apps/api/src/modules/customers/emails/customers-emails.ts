import { defineEmails } from '#libs/notifications/define-emails'
import { en } from './locales/en'
import { es } from './locales/es'
import { ptBR } from './locales/pt-BR'

/** The customers module's emails (ADR 0073), on their own job kind; nothing in them is a credential. */
export const customersEmails = defineEmails('customers.send-email', { en, es, 'pt-BR': ptBR })
