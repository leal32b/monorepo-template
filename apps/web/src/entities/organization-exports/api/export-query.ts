import { type ApiClient, createQuery } from '#shared/api'
import { getExport } from './export-api'

/** The organization's last export, as a router query keyed by its id (ADR 0038): the General route's `preload` starts it. */
export const organizationExportQuery = (api: ApiClient) =>
  createQuery((organizationId: string) => getExport(api, organizationId), 'organization-export')
