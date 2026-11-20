import { type LogoType, logoLimits, logoProblems, type OrganizationLogo, subscriptionProblems } from '@repo/contracts'
import { confirmLogo, signLogoUpload } from '#entities/organizations'
import { type ApiClient, failureOf } from '#shared/api'

/** Why a logo was not saved, each with its own words: the first two are found before anything is sent. */
export type LogoFailure = 'wrongType' | 'tooLarge' | 'dimensions' | 'failed' | 'tooMany' | 'readOnly'

const failures: Record<string, LogoFailure> = {
  [logoProblems.unsupportedType]: 'wrongType',
  [logoProblems.tooLarge]: 'tooLarge',
  [logoProblems.dimensions]: 'dimensions',
  [logoProblems.tooManyUploads]: 'tooMany',
  [subscriptionProblems.readOnly]: 'readOnly'
}

const isLogoType = (type: string): type is LogoType => (logoLimits.types as readonly string[]).includes(type)

/** What the store must be sent: one `PUT` of the file; anything but a 2xx is an upload that did not finish. */
async function send(url: string, headers: Record<string, string>, file: File, put: typeof fetch): Promise<boolean> {
  try {
    return (await put(url, { method: 'PUT', headers, body: file })).ok
  } catch {
    return false // the store out of reach, or a CORS rule that refused the page
  }
}

/**
 * Makes `file` the organization's logo (ADR 0076): its type and size checked here first, so a wrong choice
 * says so at once; then an address from the API, the file sent straight to the store, and the API told,
 * which checks the bytes and answers the logo. A refusal comes back as the reason to show.
 */
export async function uploadLogo(
  api: ApiClient,
  organizationId: string,
  file: File,
  put: typeof fetch = globalThis.fetch
): Promise<{ logo: OrganizationLogo } | { failure: LogoFailure }> {
  if (!isLogoType(file.type) || file.size === 0) return { failure: 'wrongType' }
  if (file.size > logoLimits.maxBytes) return { failure: 'tooLarge' }
  try {
    const upload = await signLogoUpload(api, organizationId, { type: file.type, size: file.size })
    if (!(await send(upload.url, upload.headers, file, put))) return { failure: 'failed' }
    return { logo: await confirmLogo(api, organizationId, upload.uploadId) }
  } catch (error) {
    return { failure: failures[failureOf(error).code ?? ''] ?? 'failed' }
  }
}
