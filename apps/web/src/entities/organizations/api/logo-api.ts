import {
  type LogoUploadInput,
  type OrganizationLogo,
  organizationLogoSchema,
  type SignedUpload,
  signedUploadSchema
} from '@repo/contracts'
import { type ApiClient, noContent } from '#shared/api'

/** The organization logo's routes (ADR 0076): `organization:update`, owners and admins. */
const base = (organizationId: string) => `/api/organizations/${encodeURIComponent(organizationId)}/logo`

/** An address the file is `PUT` to, straight to the store, for the type and size given. */
export function signLogoUpload(api: ApiClient, organizationId: string, file: LogoUploadInput): Promise<SignedUpload> {
  return api.send('POST', `${base(organizationId)}/uploads`, file, signedUploadSchema)
}

/** Makes the upload the organization's logo, once the API checked its bytes: the answer is the logo. */
export function confirmLogo(api: ApiClient, organizationId: string, uploadId: string): Promise<OrganizationLogo> {
  return api.send('PUT', base(organizationId), { uploadId }, organizationLogoSchema)
}

/** Removes the organization's logo. */
export function removeLogo(api: ApiClient, organizationId: string): Promise<undefined> {
  return api.send('DELETE', base(organizationId), undefined, noContent)
}
