import * as z from 'zod/mini'

/**
 * Every language a notification is written in (ADR 0073), which the user's `locale` field also accepts.
 * Adding one is a line here and a file in each module's `emails/locales/`, which the type then demands.
 */
export const locales = ['en', 'es', 'pt-BR'] as const

export type Locale = (typeof locales)[number]

export const localeSchema = z.enum(locales)
