import type { Kysely } from 'kysely'
import { KyselyAuditTrail } from '#libs/database/kysely-audit-trail'
import { KyselyUnitOfWork } from '#libs/database/kysely-unit-of-work'
import type { AuditUnitOfWork } from '../audit-unit-of-work.port'

/** The trail bound to one tenant transaction per `run` (ADR 0052, ADR 0055): never read on the pool. */
export function kyselyAuditUnitOfWork(db: Kysely<unknown>): AuditUnitOfWork {
  return new KyselyUnitOfWork(db, (transaction) => ({ audit: new KyselyAuditTrail(transaction) }))
}
