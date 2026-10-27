import { z } from 'zod'

/** `http(s)://host[:port]` exactly: the client appends paths to it. */
function isHttpOrigin(value: string): boolean {
  try {
    const url = new URL(value)
    return ['http:', 'https:'].includes(url.protocol) && url.origin === value
  } catch {
    return false
  }
}

const webEnvSchema = z.object({
  VITE_API_BASE_URL: z
    .string()
    .default('')
    .refine(
      (value) => value === '' || isHttpOrigin(value),
      'must be empty (same origin) or an http(s) origin such as https://api.example.com'
    )
})

export type WebEnv = {
  /** Origin of the API; empty means same origin (the Vite dev proxy). */
  apiBaseUrl: string
}

/**
 * Reads the build-time variables of the web app. Vite inlines every `VITE_*` value into the
 * bundle, so they are public: never a secret here.
 */
export function readWebEnv(env: Record<string, unknown>): WebEnv {
  const result = webEnvSchema.safeParse(env)
  if (!result.success) throw new Error(`Invalid web environment:\n${z.prettifyError(result.error)}`)
  return { apiBaseUrl: result.data.VITE_API_BASE_URL }
}
